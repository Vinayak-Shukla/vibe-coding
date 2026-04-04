#!/usr/bin/env node
'use strict';

const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_DIR = path.join(os.tmpdir(), `vibe-coding-${os.userInfo().uid}`);
const SOCKET_PATH = path.join(STATE_DIR, 'daemon.sock');
const PID_PATH = path.join(STATE_DIR, 'daemon.pid');
const DAEMON_PATH = path.join(__dirname, 'daemon.js');

function isDaemonRunning() {
  try {
    const pid = parseInt(fs.readFileSync(PID_PATH, 'utf8').trim(), 10);
    process.kill(pid, 0); // signal 0 = check if alive
    return true;
  } catch {
    return false;
  }
}

function startDaemon() {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(STATE_DIR, { recursive: true });

    const child = spawn(process.execPath, [DAEMON_PATH], {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });

    const timeout = setTimeout(() => {
      child.unref();
      // Give it a moment then try anyway
      resolve();
    }, 3000);

    child.on('message', (msg) => {
      if (msg === 'ready') {
        clearTimeout(timeout);
        child.unref();
        child.disconnect();
        resolve();
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start daemon: ${err.message}`));
    });
  });
}

function sendCommand(cmd) {
  return new Promise((resolve, reject) => {
    const conn = net.createConnection(SOCKET_PATH);
    let data = '';

    conn.on('connect', () => {
      conn.end(JSON.stringify(cmd));
    });

    conn.on('data', (chunk) => {
      data += chunk.toString();
    });

    conn.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({ ok: false, error: 'Invalid response from daemon' });
      }
    });

    conn.on('error', (err) => {
      reject(err);
    });
  });
}

async function send(cmd, retries = 1) {
  try {
    return await sendCommand(cmd);
  } catch (err) {
    if (retries > 0 && (err.code === 'ENOENT' || err.code === 'ECONNREFUSED')) {
      // Daemon not running — start it
      await startDaemon();
      // Wait a bit for socket to be ready
      await new Promise((r) => setTimeout(r, 500));
      return send(cmd, retries - 1);
    }
    throw err;
  }
}

// --- CLI Interface ---

async function main() {
  const args = process.argv.slice(2);
  const action = args[0];

  if (!action) {
    console.error('Usage: client.js <action> [args...]');
    console.error('Actions: play [url], stop, status, volume <0-100>, toggle, vibe [name], save-vibe <name> <url>, shutdown');
    process.exit(1);
  }

  let cmd;

  switch (action) {
    case 'play':
      cmd = { action: 'play', url: args[1] || undefined };
      // If called from a hook (auto-play), mark it
      if (process.env.VIBE_AUTO_PLAY === '1') {
        cmd.autoPlay = true;
      }
      break;

    case 'stop':
      cmd = { action: 'stop' };
      // If called from the Stop hook, mark as auto-stop
      if (process.env.VIBE_AUTO_STOP === '1') {
        cmd.autoStop = true;
      }
      break;

    case 'status':
      cmd = { action: 'status' };
      break;

    case 'volume':
      cmd = { action: 'volume', volume: args[1] };
      break;

    case 'toggle':
      cmd = { action: 'toggle' };
      break;

    case 'vibe':
      cmd = { action: 'vibe', name: args[1] || undefined };
      break;

    case 'save-vibe':
      cmd = { action: 'save-vibe', name: args[1], url: args[2], description: args[3] };
      break;

    case 'shutdown':
      cmd = { action: 'shutdown' };
      break;

    default:
      console.error(`Unknown action: ${action}`);
      process.exit(1);
  }

  try {
    if (action === 'shutdown') {
      await send(cmd).catch(() => {});
      console.log('Daemon shut down');
      return;
    }

    const result = await send(cmd);

    if (action === 'status') {
      const s = result;
      console.log(`Playing:    ${s.playing ? `Yes — ${s.currentTrack}` : 'No'}`);
      console.log(`Auto-play:  ${s.autoPlay ? 'On' : 'Off'}`);
      console.log(`Volume:     ${s.volume}`);
      console.log(`Vibe:       ${s.currentVibe}`);
      if (s.availableVibes) {
        console.log(`Vibes:      ${s.availableVibes.join(', ')}`);
      }
    } else if (action === 'vibe' && result.vibes) {
      console.log(`Current vibe: ${result.currentVibe}\n`);
      console.log('Available vibes:');
      for (const [name, desc] of Object.entries(result.vibes)) {
        const marker = name === result.currentVibe ? ' *' : '';
        console.log(`  ${name}${marker} — ${desc}`);
      }
    } else if (result.ok) {
      if (result.resumed) console.log(`Resumed: ${result.track}`);
      else if (result.track) console.log(`Now playing: ${result.track}`);
      else if (result.paused) console.log('Paused');
      else if (result.volume !== undefined) console.log(`Volume set to ${result.volume}`);
      else if (result.autoPlay !== undefined) console.log(`Auto-play: ${result.autoPlay ? 'On' : 'Off'}`);
      else if (result.currentVibe) console.log(`Vibe set to: ${result.currentVibe}`);
      else if (result.saved) console.log(`Saved vibe: ${result.saved}`);
      else if (result.skipped) console.log(`Skipped: ${result.reason}`);
      else if (action === 'stop') console.log('Stopped');
    } else {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
  } catch (e) {
    console.error(`[vibe-coding] ${e.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { send };
