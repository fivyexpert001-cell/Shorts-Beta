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

## Phase 3 — sprites (ai33.pro image gen / Seedream)
Generate the ship/army/flag icons that ride the map. Needs `AI33PRO_API_KEY` in `.env`.

```bash
npm run sprite -- ship          # built-in prompt → public/sprites/ship.png
npm run sprite -- army          # also: flag, arrow, city, explosion
npm run sprite -- "a lighthouse, flat vector, transparent background" lighthouse
```

Then point a spec's route at it:
```ts
route.sprite = { image: "sprites/ship.png", size: 96 }
```
If the file is missing, the composition falls back to the built-in inline SVG
ship, so the example always renders. A committed `sprites/ship-placeholder.png`
(exported from the inline ship via the `ShipSpriteStill` composition) is the
default until you generate your own.

> The image-URL field in the result is extracted tolerantly; if a generation
> ever returns an unexpected shape, `pipeline/image.ts` prints the metadata so
> you can adjust `extractImageUrl()`.

## Phase 4 — Gemini writes the spec
Give a topic → Gemini returns a complete, **validated** VideoSpec (narration
script + route coordinates + camera beats + overlays) written to `specs/<id>.json`.
Needs `GEMINI_API_KEY` in `.env` and the host `generativelanguage.googleapis.com`
allowed in your network policy.

```bash
npm run script -- "The voyage of Magellan" 40      # 40-second short
# → specs/voyage-of-magellan.json (validated against the schema, auto-repaired once if needed)
```

Render any JSON spec directly (duration/size are read from the file):
```bash
npx remotion render src/index.ts Short out/magellan.mp4 \
  --props=specs/voyage-of-magellan.json --gl=swiftshader
```

`specs/example.json` is a committed reference of the exact format Gemini targets.
Output is validated with Zod (`src/lib/validateSpec.ts`) before it's saved.
