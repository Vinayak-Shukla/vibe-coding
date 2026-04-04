#!/usr/bin/env node
'use strict';

const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { resolveAudio } = require('./resolve-audio');
const { startPlayback } = require('./playback');

const STATE_DIR = path.join(os.tmpdir(), `vibe-coding-${os.userInfo().uid}`);
const SOCKET_PATH = path.join(STATE_DIR, 'daemon.sock');
const STATE_PATH = path.join(STATE_DIR, 'state.json');
const PID_PATH = path.join(STATE_DIR, 'daemon.pid');

const QUEUE_SIZE = 2;           // pre-resolve this many tracks
const URL_MAX_AGE = 4 * 60000;  // direct URLs expire after ~5min, refresh at 4

// --- State ---

const DEFAULT_STATE = {
  autoPlay: true,
  volume: 50,
  currentVibe: 'lofi',
  currentTrack: null,
  playing: false,
  customVibes: {},
};

let state = { ...DEFAULT_STATE };
let currentPlayback = null;
let manualPlay = false;

// --- Pre-resolve Queue ---
// Holds pre-resolved tracks: { title, directUrl, youtubeUrl, resolvedAt }
let readyQueue = [];
let resolving = false;  // guard against concurrent refills

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    const saved = JSON.parse(raw);
    state = { ...DEFAULT_STATE, ...saved };
  } catch {
    state = { ...DEFAULT_STATE };
  }
}

function saveState() {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch {}
}

/**
 * Refill the ready queue in the background.
 * Resolves tracks for the current vibe so they're ready instantly.
 */
async function refillQueue() {
  if (resolving) return;
  resolving = true;

  try {
    // Purge expired entries
    readyQueue = readyQueue.filter(t => (Date.now() - t.resolvedAt) < URL_MAX_AGE);

    const vibe = state.currentVibe;
    const customUrl = state.customVibes[vibe]?.url;

    while (readyQueue.length < QUEUE_SIZE) {
      try {
        const opts = customUrl ? { url: customUrl } : { vibe };
        const track = await resolveAudio(opts);
        readyQueue.push(track);
      } catch {
        break; // don't loop on persistent failures
      }
    }
  } finally {
    resolving = false;
  }
}

/**
 * Pop a ready track from the queue, or resolve on-demand.
 */
async function getTrack(opts = {}) {
  // If a specific URL was requested, resolve it directly (can't use queue)
  if (opts.url) {
    return resolveAudio({ url: opts.url });
  }

  // Check queue for a fresh track
  while (readyQueue.length > 0) {
    const track = readyQueue.shift();
    if ((Date.now() - track.resolvedAt) < URL_MAX_AGE) {
      // Refill in background after popping
      refillQueue().catch(() => {});
      return track;
    }
  }

  // Queue empty — resolve on-demand (slower, but works)
  const vibe = state.currentVibe;
  const customUrl = state.customVibes[vibe]?.url;
  const track = await resolveAudio(customUrl ? { url: customUrl } : { vibe });

  // Start refilling for next time
  refillQueue().catch(() => {});

  return track;
}

// --- Playback Control ---

async function handlePlay(opts = {}) {
  stopPlayback();

  try {
    let url = opts.url;
    const vibe = url ? undefined : state.currentVibe;
    if (!url && vibe && state.customVibes[vibe]) {
      url = state.customVibes[vibe].url;
    }

    const track = await getTrack({ url });

    currentPlayback = startPlayback({
      directUrl: track.directUrl,
      url: track.youtubeUrl,     // fallback if directUrl fails
      volume: state.volume,
      onEnd() {
        state.playing = false;
        state.currentTrack = null;
        currentPlayback = null;
        saveState();
      },
    });

    state.playing = true;
    state.currentTrack = track.title;
    saveState();

    return { ok: true, track: track.title };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function stopPlayback() {
  if (currentPlayback) {
    currentPlayback.stop();
    currentPlayback = null;
  }
  state.playing = false;
  state.currentTrack = null;
  saveState();
  // Pre-resolve next tracks so the next play is instant
  refillQueue().catch(() => {});
}

// --- Command Handler ---

async function handleCommand(cmd) {
  switch (cmd.action) {
    case 'play': {
      if (cmd.autoPlay && !state.autoPlay) {
        return { ok: true, skipped: true, reason: 'auto-play disabled' };
      }
      manualPlay = !cmd.autoPlay;

      // If we have a paused track (auto-play resuming), just resume it
      if (cmd.autoPlay && currentPlayback && currentPlayback.paused && currentPlayback.alive) {
        currentPlayback.resume();
        state.playing = true;
        saveState();
        return { ok: true, track: state.currentTrack, resumed: true };
      }

      // Otherwise start a new track
      return handlePlay({ url: cmd.url });
    }

    case 'stop': {
      if (cmd.autoStop && manualPlay) {
        return { ok: true, skipped: true, reason: 'manual play — use /vibe-coding:stop to stop' };
      }

      // Auto-stop: pause instead of killing (so we can resume on next prompt)
      if (cmd.autoStop && currentPlayback && currentPlayback.alive) {
        currentPlayback.pause();
        state.playing = false;
        saveState();
        return { ok: true, paused: true };
      }

      // Manual stop: fully kill the track
      stopPlayback();
      manualPlay = false;
      return { ok: true };
    }

    case 'status': {
      const vibes = loadVibesData();
      const allVibes = [
        ...Object.keys(vibes),
        ...Object.keys(state.customVibes),
      ];
      return {
        ok: true,
        playing: state.playing,
        autoPlay: state.autoPlay,
        volume: state.volume,
        currentVibe: state.currentVibe,
        currentTrack: state.currentTrack,
        availableVibes: allVibes,
        queuedTracks: readyQueue.length,
      };
    }

    case 'volume': {
      const vol = parseInt(cmd.volume, 10);
      if (isNaN(vol) || vol < 0 || vol > 100) {
        return { ok: false, error: 'Volume must be 0-100' };
      }
      state.volume = vol;
      saveState();
      if (state.playing && currentPlayback) {
        return handlePlay({ url: undefined });
      }
      return { ok: true, volume: vol };
    }

    case 'toggle': {
      state.autoPlay = !state.autoPlay;
      saveState();
      return { ok: true, autoPlay: state.autoPlay };
    }

    case 'vibe': {
      if (!cmd.name) {
        const vibes = loadVibesData();
        const allVibes = {
          ...Object.fromEntries(
            Object.entries(vibes).map(([k, v]) => [k, v.description])
          ),
          ...Object.fromEntries(
            Object.entries(state.customVibes).map(([k, v]) => [k, v.description || 'Custom'])
          ),
        };
        return { ok: true, currentVibe: state.currentVibe, vibes: allVibes };
      }
      const vibes = loadVibesData();
      if (!vibes[cmd.name] && !state.customVibes[cmd.name]) {
        return { ok: false, error: `Unknown vibe: ${cmd.name}. Use /vibe-coding:vibe to list available vibes.` };
      }
      state.currentVibe = cmd.name;
      // Vibe changed — clear queue and refill with new vibe
      readyQueue = [];
      refillQueue().catch(() => {});
      saveState();
      return { ok: true, currentVibe: cmd.name };
    }

    case 'save-vibe': {
      if (!cmd.name || !cmd.url) {
        return { ok: false, error: 'Usage: save-vibe <name> <youtube-url>' };
      }
      state.customVibes[cmd.name] = {
        url: cmd.url,
        description: cmd.description || 'Custom vibe',
      };
      saveState();
      return { ok: true, saved: cmd.name };
    }

    case 'shutdown': {
      stopPlayback();
      cleanup();
      process.exit(0);
    }

    default:
      return { ok: false, error: `Unknown action: ${cmd.action}` };
  }
}

function loadVibesData() {
  try {
    const vibesPath = path.join(__dirname, '..', 'data', 'vibes.json');
    delete require.cache[require.resolve(vibesPath)];
    return require(vibesPath);
  } catch {
    return {};
  }
}

// --- Socket Server ---

let server;

function cleanup() {
  stopPlayback();
  try { fs.unlinkSync(SOCKET_PATH); } catch {}
  try { fs.unlinkSync(PID_PATH); } catch {}
}

function startServer() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  try { fs.unlinkSync(SOCKET_PATH); } catch {}

  fs.writeFileSync(PID_PATH, String(process.pid));
  loadState();

  // Pre-resolve tracks immediately on startup
  refillQueue().catch(() => {});

  server = net.createServer({ allowHalfOpen: true }, (conn) => {
    let data = '';
    conn.on('data', (chunk) => { data += chunk.toString(); });
    conn.on('end', async () => {
      try {
        const cmd = JSON.parse(data);
        const result = await handleCommand(cmd);
        conn.end(JSON.stringify(result));
      } catch (e) {
        try { conn.end(JSON.stringify({ ok: false, error: e.message })); } catch {}
      }
    });
  });

  server.listen(SOCKET_PATH, () => {
    if (process.send) process.send('ready');
  });

  server.on('error', (err) => {
    console.error('[vibe-coding daemon] Server error:', err.message);
    process.exit(1);
  });
}

process.on('SIGTERM', () => { cleanup(); process.exit(0); });
process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('exit', cleanup);

startServer();
