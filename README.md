# Shorts-Beta

Automated pipeline for faceless, map-driven geography/history YouTube Shorts
(in the style of [GeoGlobeTales](https://www.youtube.com/@GeoGlobeTales/shorts)).

**Stack:** Remotion (video engine) · MapLibre/Mapbox (animated maps) ·
Turf.js (routes) · ai33.pro (voice + images + music) · Gemini (scripts).

- **[BUILD_PLAN.md](./BUILD_PLAN.md)** — architecture and phased build plan.
- **[docs/ai33pro-api.md](./docs/ai33pro-api.md)** — verified ai33.pro API reference (voice/image/music).

## Setup
1. `cp .env.example .env` and fill in your real API keys (`.env` is gitignored).
2. `npm install`

## Render the Phase 1 example
The example short renders **fully offline** (bundled `public/countries.geojson`
basemap — no map tile server or API needed):

```bash
# Preview live in the browser:
npm run dev                 # Remotion Studio

# Render to MP4 (software WebGL via SwiftShader is set in remotion.config.ts):
npx remotion render src/index.ts Short out/example.mp4 --gl=swiftshader
```

Output: `out/example.mp4` (1080×1920, 12s). Edit `specs/example.ts` to change the
route, camera, and overlays. See **BUILD_PLAN.md** for the roadmap (Phase 2 =
ai33.pro voiceover + SRT-synced captions).

> **Rendering notes (headless/cloud):** maps draw with WebGL, so pass
> `--gl=swiftshader` where there's no GPU. Keeping the basemap local avoids
> needing the render browser to reach a tile host through a proxy.
