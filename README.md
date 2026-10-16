# 🎨 AI Paint Studio

A full-featured browser-based paint program with AI image generation. Built with React, TypeScript, Vite, Konva.js, and Zustand.

## Features

- **Drawing tools**: brush, eraser, line, rectangle, ellipse, flood fill, eyedropper, text, marquee select
- **Layers**: add / delete / duplicate / reorder / rename, opacity, visibility, blend modes
- **Adjustments**: blur, brightness, contrast, grayscale, invert (per layer)
- **History**: unlimited undo/redo (30-step cap)
- **AI generation**: describe an image → generate with AI → insert as a layer
  - **Pollinations** (default): completely free, no key. Rate-limited to 1 image / 45s (auto-retries).
  - **Google Gemini**: free tier — get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
  - **Hugging Face**: free monthly credits — token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
  - **Cloudflare Workers AI**: free daily allocation — token + Account ID from [dash.cloudflare.com](https://dash.cloudflare.com) (AI → API Tokens)
  - **OpenAI**: paid — set `OPENAI_API_KEY` in `.env.local`
  - Keys are stored in your browser's localStorage and sent through the dev proxy (never bundled).
  - Style presets: game icon, app icon, character, creature, vehicle, flat vector, pixel art
  - Transparent background option for icons
- **Export**: PNG (transparent), JPEG, single icon (128px), or full icon set (16/32/64/128/256)
- **Zoom**: Ctrl+scroll to zoom

## Keyboard shortcuts

| Key | Tool | | Key | Action |
|-----|------|-|-----|--------|
| B | Brush | | Ctrl+Z | Undo |
| E | Eraser | | Ctrl+Shift+Z | Redo |
| L | Line | | Ctrl+Enter | Generate (in AI panel) |
| R | Rectangle | | Ctrl+D | Clear selection |
| O | Ellipse | | | |
| F | Flood fill | | | |
| I | Eyedropper | | | |
| T | Text | | | |
| S | Select | | | |

## Getting started

```bash
npm install
```

### AI generation setup

API calls are proxied through the Vite dev server so your API key stays out of the browser.
Create a `.env.local` file in the project root:

```
OPENAI_API_KEY=sk-your-key-here
```

Then:

```bash
npm run dev      # open http://localhost:5175
```

The provider layer (`src/ai/provider.ts`) is designed to be provider-agnostic — add new adapters by implementing `ImageGenerationProvider` and registering them in `src/ai/index.ts`.

## Production build

```bash
npm run build    # outputs to dist/
npm run preview  # serve the production build locally
```

> Note: the AI proxy is a dev-server feature; for production deployment you'd add a small server-side proxy (the key must never ship in the client bundle).

## Project structure

```
src/
  ai/            # Provider-agnostic AI image generation (OpenAI adapter included)
  components/    # CanvasStage, ToolPalette, LayersPanel, PropertiesPanel, AIPromptPanel
  store/         # Zustand editor state (layers, tools, history)
  utils/export.ts# Flatten, PNG/JPEG export, icon-size exports
```
