# Claude Plugin Marketplace

> Community-maintained plugins for [Claude Code](https://claude.ai/claude-code)

A growing directory of plugins that extend Claude Code with new skills, tools, and automations. Install any plugin with a single command.

---

## Plugins

### Featured

| Plugin | Description | Author | Install |
|--------|-------------|--------|---------|
| [Vibe Coding](#vibe-coding) | Lofi beats while Claude thinks | [@Vinayak-Shukla](https://github.com/Vinayak-Shukla) | `claude plugin add Vinayak-Shukla/vibe-coding` |

---

## Plugin Details

### Vibe Coding

> Lofi beats while Claude thinks. Vibe while you vibe-code.

Automatically plays chill music while Claude is working on your code. When Claude starts thinking, the music starts. When Claude responds, it stops.

**Install**
```bash
claude plugin add Vinayak-Shukla/vibe-coding
```

**Setup** (after installing)
```
/vibe-coding:setup
```

**Skills**

| Command | Description |
|---------|-------------|
| `/vibe-coding:setup` | Install system dependencies (yt-dlp, ffmpeg) |
| `/vibe-coding:play [url]` | Play music (current vibe, or a specific YouTube URL) |
| `/vibe-coding:stop` | Stop the music |
| `/vibe-coding:status` | Show what's playing, volume, auto-play state |
| `/vibe-coding:volume <0-100>` | Set volume |
| `/vibe-coding:toggle` | Toggle auto-play on/off |
| `/vibe-coding:vibe [name]` | Switch vibe preset (no arg = list vibes) |
| `/vibe-coding:save-vibe <name> <url>` | Save a custom vibe with a YouTube URL |

**Vibes**: `lofi` · `jazz` · `rain` · `chill` · `focus` + custom

**Requirements**: macOS · Node.js >=18 · yt-dlp · ffmpeg

**Source**: [Vinayak-Shukla/vibe-coding](https://github.com/Vinayak-Shukla/vibe-coding)

---

## Submit Your Plugin

Want your plugin listed here? [Open a pull request](https://github.com/Vinayak-Shukla/vibe-coding/pulls) — see [CONTRIBUTING.md](./CONTRIBUTING.md) for the format.

Requirements:
- Public GitHub repo
- Valid `plugin.json` (see [Claude plugin docs](https://docs.anthropic.com/en/claude-code/plugins))
- Clear README with install instructions

---

## Building a Plugin

Claude Code plugins live in a GitHub repo with a `.claude-plugin/plugin.json` manifest. Users install them with:

```bash
claude plugin add <github-user>/<repo>
```

Resources:
- [Claude Code Plugin Docs](https://docs.anthropic.com/en/claude-code/plugins)
- [Example: vibe-coding source](./.claude-plugin/plugin.json)

---

## License

This registry is MIT licensed. Individual plugins carry their own licenses.
