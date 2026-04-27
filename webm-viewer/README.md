# WebM Viewer for VS Code

Preview WebM video files directly inside Visual Studio Code — no external app needed.

## Features

- Opens `.webm` files **automatically** as a custom editor (just double-click the file).
- Full HTML5 video controls: play/pause, seek bar, volume slider, playback speed, fullscreen.
- **Keyboard shortcuts:**

  | Key | Action |
  |-----|--------|
  | Space / K | Play / Pause |
  | ← / → | Seek ±5 seconds |
  | ↑ / ↓ | Volume ±10% |
  | M | Toggle mute |
  | F | Toggle fullscreen |
  | 0 | Jump to start |

- Playback speed cycle: 0.25×, 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2×.
- Click anywhere on the video to play/pause.
- Works **offline** — no external CDN dependencies.
- Strict Content Security Policy with a per-session nonce.

## Requirements

- Visual Studio Code **1.90.0** or later.

## Installation

### From the Marketplace

Search for **WebM Viewer** in the Extensions panel (`Ctrl+Shift+X`).

### From a .vsix file

```bash
code --install-extension webm-viewer-0.1.0.vsix
```

## Usage

Open any `.webm` file in the Explorer. It opens automatically in the WebM Viewer panel.

If the plain text editor opens instead, right-click the file → **Open With → WebM Preview**.

## Building from Source

```bash
git clone https://github.com/PLACEHOLDER_PUBLISHER/webm-viewer.git
cd webm-viewer
npm install
npm run compile
```

Press **F5** in VS Code to launch an Extension Development Host with the extension loaded, then open any `.webm` file to test.

## Scripts

| Script | Purpose |
|--------|---------|
| `bash scripts/test.sh` | Build and launch Extension Development Host |
| `npm run package` | Create a `.vsix` package |
| `code --install-extension webm-viewer-0.1.0.vsix` | Install the packaged extension |
| `VSCE_PAT=<token> bash scripts/publish.sh` | Publish to the Marketplace |
| `bash scripts/remove.sh` | Uninstall from local VS Code |

## Publishing to the Marketplace

1. Register a publisher at <https://marketplace.visualstudio.com/manage>.
2. Replace `PLACEHOLDER_PUBLISHER` in `package.json` and this README with your publisher ID.
3. Create a Personal Access Token (PAT) at <https://dev.azure.com> with **Marketplace > Publish** scope.
4. Run:

```bash
VSCE_PAT=<your-token> bash scripts/publish.sh
```

## Known Limitations

- Playback depends on the Electron/Chromium version bundled with VS Code. VP8 and VP9 with Vorbis or Opus audio are universally supported. AV1 support depends on the VS Code version.
- Very large files (>2 GB) may have slow seek performance due to HTML5 `<video>` buffering.

## License

MIT
