#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');

function which(cmd) {
  try {
    return execFileSync('which', [cmd], { encoding: 'utf8', timeout: 3000 }).trim();
  } catch {
    return null;
  }
}

function checkDeps() {
  const deps = {
    'yt-dlp': which('yt-dlp'),
    ffplay: which('ffplay'),
    mpv: which('mpv'),
    afplay: which('afplay'),
  };

  // Pick best player
  let player;
  if (deps.ffplay) player = 'ffplay';
  else if (deps.mpv) player = 'mpv';
  else if (deps.afplay) player = 'afplay';
  else player = null;

  const hasYtdlp = !!deps['yt-dlp'];

  return { deps, hasYtdlp, player };
}

function getMissingDeps() {
  const { hasYtdlp, player } = checkDeps();
  const missing = [];
  if (!hasYtdlp) missing.push('yt-dlp');
  if (!player) missing.push('ffmpeg (for ffplay)');
  return missing;
}

function printReport() {
  const { hasYtdlp, player } = checkDeps();
  const missing = getMissingDeps();

  if (missing.length > 0) {
    console.error(`[vibe-coding] Missing dependencies: ${missing.join(', ')}`);
    console.error('');
    console.error('  Install with:  brew install yt-dlp ffmpeg');
    console.error('');
    console.error('  Or with pip:   pip3 install yt-dlp');
    console.error('  And ffmpeg:    brew install ffmpeg');
    process.exit(1);
  }

  console.log(`[vibe-coding] yt-dlp=ok, player=${player}`);
  return { hasYtdlp, player };
}

if (require.main === module) {
  printReport();
}

module.exports = { checkDeps, getMissingDeps };
