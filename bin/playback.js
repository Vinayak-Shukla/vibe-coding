#!/usr/bin/env node
'use strict';

const { spawn } = require('child_process');
const { checkDeps } = require('./check-deps');

/**
 * Start audio playback.
 *
 * Two modes:
 * - directUrl: ffplay/mpv opens the URL directly (instant, no yt-dlp process)
 * - url (YouTube URL): pipes through yt-dlp (slower startup, used as fallback)
 *
 * @param {object} opts
 * @param {string} [opts.directUrl] - Pre-resolved direct audio stream URL (preferred)
 * @param {string} [opts.url] - YouTube URL (fallback, piped through yt-dlp)
 * @param {number} opts.volume - 0-100
 * @param {function} [opts.onEnd] - Called when playback ends naturally
 * @returns {{ stop: function }}
 */
function startPlayback(opts) {
  const { player } = checkDeps();

  if (!player) {
    throw new Error('No audio player available');
  }

  // Direct URL mode: instant playback, no yt-dlp needed
  if (opts.directUrl && (player === 'ffplay' || player === 'mpv')) {
    return startDirectUrl(player, opts);
  }

  // Fallback: pipe through yt-dlp
  if (opts.url) {
    if (player === 'afplay') {
      return startAfplayPipeline(opts);
    }
    return startStreamPipeline(player, opts);
  }

  throw new Error('No URL provided');
}

// Instant mode: ffplay/mpv opens a pre-resolved direct URL
function startDirectUrl(player, opts) {
  const { directUrl, volume, onEnd } = opts;
  let stopped = false;
  let proc;

  if (player === 'ffplay') {
    proc = spawn('ffplay', [
      '-nodisp', '-autoexit', '-loglevel', 'quiet',
      '-volume', String(Math.round(volume)),
      directUrl,
    ], { stdio: 'ignore' });
  } else {
    proc = spawn('mpv', [
      '--no-video',
      `--volume=${Math.round(volume)}`,
      '--really-quiet',
      directUrl,
    ], { stdio: 'ignore' });
  }

  let dead = false;
  let paused = false;

  proc.on('error', () => { dead = true; });
  proc.on('close', () => {
    if (!dead && onEnd) onEnd();
    dead = true;
  });

  return {
    stop() {
      if (!dead) {
        dead = true;
        try { proc.kill('SIGCONT'); } catch {} // unfreeze before kill
        try { proc.kill('SIGTERM'); } catch {}
      }
    },
    pause() {
      if (!dead && !paused) {
        try { proc.kill('SIGSTOP'); } catch {}
        paused = true;
      }
    },
    resume() {
      if (!dead && paused) {
        try { proc.kill('SIGCONT'); } catch {}
        paused = false;
      }
    },
    get paused() { return paused; },
    get alive() { return !dead; },
  };
}

// Pipe mode: yt-dlp stdout → ffplay/mpv stdin
function startStreamPipeline(player, opts) {
  const { url, volume, onEnd } = opts;
  let stopped = false;

  const ytdlp = spawn('yt-dlp', [
    '-f', 'bestaudio', '-o', '-',
    '--no-warnings', '--no-progress', url,
  ], { stdio: ['ignore', 'pipe', 'ignore'] });

  let playerProc;
  if (player === 'ffplay') {
    playerProc = spawn('ffplay', [
      '-nodisp', '-autoexit', '-loglevel', 'quiet',
      '-volume', String(Math.round(volume)),
      '-i', 'pipe:0',
    ], { stdio: ['pipe', 'ignore', 'ignore'] });
  } else {
    playerProc = spawn('mpv', [
      '--no-video', `--volume=${Math.round(volume)}`,
      '--really-quiet', '-',
    ], { stdio: ['pipe', 'ignore', 'ignore'] });
  }

  ytdlp.stdout.pipe(playerProc.stdin);
  ytdlp.stdout.on('error', () => {});
  playerProc.stdin.on('error', () => {});
  ytdlp.on('error', () => {});
  playerProc.on('error', () => {});

  let dead = false;
  let paused = false;

  playerProc.on('close', () => {
    if (!dead) {
      dead = true;
      try { ytdlp.kill(); } catch {}
      if (onEnd) onEnd();
    }
  });

  return {
    stop() {
      if (!dead) {
        dead = true;
        try { ytdlp.kill('SIGCONT'); } catch {}
        try { playerProc.kill('SIGCONT'); } catch {}
        try { ytdlp.kill('SIGTERM'); } catch {}
        try { playerProc.kill('SIGTERM'); } catch {}
      }
    },
    pause() {
      if (!dead && !paused) {
        try { ytdlp.kill('SIGSTOP'); } catch {}
        try { playerProc.kill('SIGSTOP'); } catch {}
        paused = true;
      }
    },
    resume() {
      if (!dead && paused) {
        try { ytdlp.kill('SIGCONT'); } catch {}
        try { playerProc.kill('SIGCONT'); } catch {}
        paused = false;
      }
    },
    get paused() { return paused; },
    get alive() { return !dead; },
  };
}

// afplay mode: yt-dlp downloads to file, then afplay plays it
function startAfplayPipeline(opts) {
  const { url, volume, onEnd } = opts;
  const os = require('os');
  const pth = require('path');
  const fs = require('fs');

  const tmpDir = pth.join(os.tmpdir(), `vibe-coding-${os.userInfo().uid}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = pth.join(tmpDir, `track-${Date.now()}.m4a`);

  let stopped = false;
  let afplayProc = null;

  const ytdlp = spawn('yt-dlp', [
    '-f', 'bestaudio', '-o', tmpFile,
    '--no-warnings', '--no-progress', url,
  ], { stdio: 'ignore' });

  ytdlp.on('close', (code) => {
    if (stopped) return;
    if (code !== 0) { cleanup(); if (onEnd) onEnd(); return; }

    const afVol = (volume / 100).toFixed(2);
    afplayProc = spawn('afplay', ['-v', afVol, tmpFile], { stdio: 'ignore' });
    afplayProc.on('close', () => { cleanup(); if (!stopped && onEnd) onEnd(); });
    afplayProc.on('error', () => cleanup());
  });

  ytdlp.on('error', () => cleanup());

  function cleanup() { try { fs.unlinkSync(tmpFile); } catch {} }

  return {
    stop() {
      if (!stopped) {
        stopped = true;
        try { ytdlp.kill('SIGTERM'); } catch {}
        if (afplayProc && !afplayProc.killed) afplayProc.kill('SIGTERM');
        cleanup();
      }
    },
  };
}

module.exports = { startPlayback };
