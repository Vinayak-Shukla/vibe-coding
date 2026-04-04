---
description: Switch vibe preset (lofi, jazz, rain, chill, focus) or list available vibes. Custom vibes supported.
allowed-tools: Bash
argument-hint: "[vibe-name]"
---

Switch or list vibes. Run:

```
node "${CLAUDE_PLUGIN_ROOT}/bin/client.js" vibe $ARGUMENTS
```

If no argument was given, display the list of available vibes with their descriptions.
If a vibe name was given, confirm the switch.
