---
description: Save a custom vibe preset with a YouTube URL — for your favorite playlists, podcasts, or channels
allowed-tools: Bash
argument-hint: "<name> <youtube-url>"
---

Save a custom vibe. Run:

```
node "${CLAUDE_PLUGIN_ROOT}/bin/client.js" save-vibe $ARGUMENTS
```

Confirm to the user that the vibe was saved, and mention they can switch to it with `/vibe-coding:vibe <name>`.
