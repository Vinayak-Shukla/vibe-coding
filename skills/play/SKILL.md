---
description: Play music — lofi beats by default, or provide a YouTube URL for anything (music, podcasts, etc.)
allowed-tools: Bash
argument-hint: "[youtube-url]"
---

Play music for the user. Run this command:

```
node "${CLAUDE_PLUGIN_ROOT}/bin/client.js" play $ARGUMENTS
```

If the command outputs "Now playing: ..." tell the user what's playing.
If there's an error, show it and suggest checking `/vibe-coding:status`.
