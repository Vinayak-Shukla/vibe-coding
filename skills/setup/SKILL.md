---
description: Install vibe-coding dependencies (yt-dlp and ffmpeg). Run this once after installing the plugin.
allowed-tools: Bash
---

Install the required system dependencies for vibe-coding. Run the check first, then install what's missing:

```
node "${CLAUDE_PLUGIN_ROOT}/bin/check-deps.js"
```

If dependencies are missing, install them. Try these in order based on what's available:

1. **Homebrew (macOS/Linux):**
   ```
   brew install yt-dlp ffmpeg
   ```

2. **pip (if brew is unavailable):**
   ```
   pip3 install yt-dlp
   ```
   (ffmpeg still needs brew or manual install)

After installing, run the check again to confirm:
```
node "${CLAUDE_PLUGIN_ROOT}/bin/check-deps.js"
```

Tell the user the result — what was installed and whether everything is ready.
