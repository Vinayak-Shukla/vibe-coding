# Contributing to the Claude Plugin Marketplace

Thanks for building a Claude Code plugin! Here's how to get it listed.

## How to Submit

1. **Fork** this repo
2. **Add a plugin entry** to `plugins/` (copy `plugins/vibe-coding.json` as a template)
3. **Add a row** to the plugins table in `README.md`
4. **Add an entry** to `registry.json`
5. **Open a pull request**

## Plugin Entry Format

Create `plugins/<your-plugin-id>.json`:

```json
{
  "id": "your-plugin-id",
  "name": "your-plugin-id",
  "displayName": "Your Plugin Name",
  "description": "One-line description of what your plugin does.",
  "author": {
    "name": "Your Name",
    "github": "your-github-username"
  },
  "repo": "your-github-username/your-repo",
  "install": "claude plugin add your-github-username/your-repo",
  "version": "1.0.0",
  "license": "MIT",
  "tags": ["tag1", "tag2"],
  "platform": ["macOS", "Linux"],
  "skills": [
    "/your-plugin:skill-name"
  ],
  "featured": false
}
```

## Requirements

- **Public repo** on GitHub
- **Valid plugin manifest** at `.claude-plugin/plugin.json` in your repo
- **README** with install instructions and a description of each skill
- **Working plugin** — test it locally before submitting

## Plugin Guidelines

- Keep descriptions short and accurate (under 100 characters)
- List all skills your plugin exposes
- Note platform requirements (macOS only, Linux, etc.)
- Tag appropriately so users can find your plugin

## Registry Entry

Also add your plugin to the `plugins` array in `registry.json`:

```json
{
  "id": "your-plugin-id",
  "displayName": "Your Plugin Name",
  "description": "One-line description.",
  "author": "your-github-username",
  "repo": "your-github-username/your-repo",
  "install": "claude plugin add your-github-username/your-repo",
  "tags": ["tag1", "tag2"],
  "platform": ["macOS"],
  "featured": false
}
```

## Questions?

Open an issue — happy to help you get your plugin listed.
