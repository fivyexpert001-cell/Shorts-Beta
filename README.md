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

## Phase 2 — voiceover + synced captions (ai33.pro)
Put your key in `.env` first (`AI33PRO_API_KEY=...`). Captions are driven by the
SRT that ai33.pro returns.

```bash
# 1. (Optional) clone a voice from a sample you have the right to use:
npm run clone -- path/to/your-sample.mp3 "My narrator"
#    → prints a voice id like clone_abc123. Put it in .env:  VOICE_ID=clone_abc123

# 2. Generate narration audio + SRT (writes public/narration/example.{mp3,srt}):
NARRATION_ID=example npm run voice -- "In 1519, five ships left Spain..." 

# 3. Point the spec at the generated files, then render:
#    specs/example.ts → narration: { audioSrc: "narration/example.mp3",
#                                     srtSrc:   "narration/example.srt" }
npx remotion render src/index.ts Short out/example.mp4 --gl=swiftshader
```

Voice id prefixes: `clone_` (your clone), `elevenlabs_` (premium), `edge_`/`kokoro_`
(cheap). Until you generate real narration, the example uses
`public/sample-captions.srt` so caption rendering can be previewed offline.

> ⚠️ Clone only a voice you own or have permission for — not another creator's.
