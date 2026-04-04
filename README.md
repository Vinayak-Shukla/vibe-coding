# vibe-coding

> Lofi beats while Claude thinks. Vibe while you vibe-code.

A [Claude Code](https://claude.ai/claude-code) plugin that automatically plays chill music while Claude is working on your code. When Claude starts thinking, the music starts. When Claude responds, it stops. Simple.

## Features

- **Auto-play** — Music plays while Claude thinks, stops when done
- **Vibes presets** — Switch between `lofi`, `jazz`, `rain`, `chill`, `focus`
- **Custom vibes** — Save your own YouTube URLs (playlists, podcasts, anything)
- **Volume control** — Adjust without leaving your terminal
- **Custom URLs** — Play any YouTube video or playlist on demand

## Setup

**One-time install (30 seconds):**

```bash
# 1. Install system dependencies
brew install yt-dlp ffmpeg

# 2. Install the plugin
claude plugin add <user>/vibe-coding
```

Or test locally:

```bash
git clone https://github.com/<user>/vibe-coding.git
claude --plugin-dir ./vibe-coding
```

npm dependencies install automatically on first session.

## Commands

| Command | Description |
|---------|-------------|
| `/vibe-coding:play [url]` | Play music (current vibe, or a specific YouTube URL) |
| `/vibe-coding:stop` | Stop the music |
| `/vibe-coding:status` | Show what's playing, volume, auto-play state |
| `/vibe-coding:volume <0-100>` | Set volume |
| `/vibe-coding:toggle` | Toggle auto-play on/off |
| `/vibe-coding:vibe [name]` | Switch vibe preset (no arg = list vibes) |
| `/vibe-coding:save-vibe <name> <url>` | Save a custom vibe with a YouTube URL |

## Built-in Vibes

| Vibe | Description |
|------|-------------|
| `lofi` | Lofi hip hop beats (default) |
| `jazz` | Jazz cafe vibes |
| `rain` | Lofi + rain ambience |
| `chill` | Chill electronic / chillhop |
| `focus` | Minimal, deep focus music |

## Examples

```
# Just start coding — music auto-plays when Claude thinks!

# Switch to jazz vibes
/vibe-coding:vibe jazz

# Lower the volume
/vibe-coding:volume 30

# Play a specific YouTube video
/vibe-coding:play https://youtube.com/watch?v=jfKfPfyJRdk

# Save your favorite podcast as a vibe
/vibe-coding:save-vibe podcast https://youtube.com/watch?v=...

# Switch to your podcast
/vibe-coding:vibe podcast

# Disable auto-play (manual control only)
/vibe-coding:toggle
```

## How It Works

1. A lightweight background daemon starts when your Claude session begins
2. When you send a message (Claude starts thinking), the `UserPromptSubmit` hook tells the daemon to play
3. When Claude responds (the `Stop` hook fires), the daemon stops playback
4. Audio pipeline: `yt-dlp` streams audio → piped to `ffplay` for playback
5. When your session ends, the daemon shuts down cleanly

## Requirements

- **Node.js** >= 18
- **yt-dlp** — YouTube audio extraction (`brew install yt-dlp`)
- **ffmpeg** — Audio playback via ffplay (`brew install ffmpeg`)
- macOS (Linux support planned)

## Troubleshooting

**No sound?** Check dependencies: `node bin/check-deps.js`

**Wrong volume?** Set it: `/vibe-coding:volume 50`

**Don't want auto-play?** Toggle it: `/vibe-coding:toggle`

**Want to use mpv instead of ffplay?** Just install it: `brew install mpv`. The plugin auto-detects available players (ffplay > mpv > afplay).

## License

MIT
