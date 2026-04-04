#!/usr/bin/env node
'use strict';

const { execFile } = require('child_process');
const path = require('path');

const VIBES_PATH = path.join(__dirname, '..', 'data', 'vibes.json');

function loadVibes() {
  delete require.cache[require.resolve(VIBES_PATH)];
  return require(VIBES_PATH);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function youtubeUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// Search YouTube using youtube-sr and return a video URL
async function searchForVibe(vibe) {
  const vibes = loadVibes();
  const vibeData = vibes[vibe];

  // Try youtube-sr search first
  try {
    const YouTube = require('youtube-sr').default;
    const searchTerm = vibeData
      ? pickRandom(vibeData.searchTerms)
      : `${vibe} music beats`;
    const results = await YouTube.search(searchTerm, { limit: 10, type: 'video' });
    if (results.length > 0) {
      const video = pickRandom(results);
      return { url: `https://www.youtube.com/watch?v=${video.id}`, title: video.title };
    }
  } catch {
    // fall through to curated list
  }

  // Fallback to curated list
  if (vibeData && vibeData.videos.length > 0) {
    const videoId = pickRandom(vibeData.videos);
    return { url: youtubeUrl(videoId), title: `${vibe} (curated)` };
  }

  throw new Error(`No videos found for vibe: ${vibe}`);
}

/**
 * Resolve a YouTube URL to a direct audio stream URL via yt-dlp -g.
 * This URL can be fed directly to ffplay for instant playback.
 */
function resolveDirectUrl(youtubeUrl) {
  return new Promise((resolve, reject) => {
    execFile('yt-dlp', [
      '-f', 'bestaudio',
      '-g',                // output direct URL only
      '--get-title',       // also get title
      '--no-warnings',
      youtubeUrl,
    ], { timeout: 20000, encoding: 'utf8' }, (err, stdout) => {
      if (err) return reject(err);
      const lines = stdout.trim().split('\n').filter(Boolean);
      // yt-dlp outputs: title\nurl
      if (lines.length < 2) return reject(new Error('yt-dlp returned unexpected output'));
      resolve({
        title: lines[0],
        directUrl: lines[1],
        youtubeUrl,
        resolvedAt: Date.now(),
      });
    });
  });
}

/**
 * Full resolve: search for vibe → get YouTube URL → get direct stream URL.
 * Returns { title, directUrl, youtubeUrl }
 */
async function resolveAudio(opts = {}) {
  let youtubeUrl = opts.url;

  if (!youtubeUrl) {
    const vibe = opts.vibe || 'lofi';
    const result = await searchForVibe(vibe);
    youtubeUrl = result.url;
  }

  return resolveDirectUrl(youtubeUrl);
}

module.exports = { resolveAudio, resolveDirectUrl, searchForVibe };
