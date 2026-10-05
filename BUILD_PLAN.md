# Shorts-Beta — Build Plan

Goal: an automated pipeline that produces faceless, map-driven geography/history
YouTube Shorts in the style of
[GeoGlobeTales](https://www.youtube.com/@GeoGlobeTales/shorts) — ideally *one
command → one finished vertical MP4*.

This is a **plan**, not code yet. It records the decisions we've made, the
architecture, and a phased milestone list so each piece can be built and
verified before the next.

---

## 1. The content formula (what every video is)

GeoGlobeTales shorts are the same template with different data. Decomposed:

1. **An animated map** — the camera flies / zooms / pans across a region. The
   camera *is* the main actor.
2. **A route or boundary line** that draws itself across the map — a voyage, an
   empire expanding, a trade route, a migration.
3. **A moving object** on the line — a ship, an arrow, an army marker.
4. **Voiceover narration** — a tight 30–50 second story or fact.
5. **Text overlays, background music, and sound effects.**

Because every short is "same skeleton, new data", it is automatable. The whole
project is really: *generate the data, then render the skeleton with it.*

---

## 2. Final tech-stack decisions

| Role | Tool | Notes |
|------|------|-------|
| **Video engine** | **Remotion** | React-based; renders every frame to a real MP4. Has official map-animation support ([docs](https://www.remotion.dev/docs/maps)). This is the core. |
| **Map (free)** | **MapLibre GL** | Open-source, no token, no usage caps, no video-ToS concerns. **Default engine.** |
| **Map (premium)** | **Mapbox GL** | Nicer satellite / 3D styles. Metered + some video-rendering ToS limits. Supported as an option. |
| **Voice (TTS)** | **ai33.pro** | `POST /v3/text-to-speech` with `with_transcript=true` → completed task metadata has `audio_url` + **`srt_url`** (the timing we sync to). Cheapest voices: `edge_*`/`kokoro_*`. |
| **Images (sprites)** | **ai33.pro** | `POST /v1i/task/generate-image` — **Seedream 4.5 is available here** (`bytedance-seedream-4.5`). Replaces fal.ai; one provider. |
| **Music** | **ai33.pro** | `POST /v1s/task/music-generation` (Suno), simple or custom mode. |

> Full, verified API contract (auth, endpoints, request/response shapes) is in
> **[`docs/ai33pro-api.md`](./docs/ai33pro-api.md)**. Base URL `https://api.ai33.pro`;
> auth header `xi-api-key`. It's an **async task API** — create → poll
> `GET /v1/task/{id}/full` until `status:"done"` → read result URLs from `metadata`.
| **Script / research** | **Google Gemini** | Picks topics, writes narration, and outputs the structured *video spec* (below). |
| **Route math** | **Turf.js** | Build GeoJSON routes, slice lines for the "draw-on" reveal, compute camera positions. |

> **Decision:** support **both** map engines behind one `MAP_ENGINE` env var, but
> **default to MapLibre** so the channel can scale without per-render cost or ToS
> risk. Switch to Mapbox only for specific videos that need its styles.

> **Decision:** **ai33.pro replaces fal.ai.** It covers voice + images + music,
> so the pipeline has one media provider plus Gemini for text.

---

## 3. Architecture (the pipeline)

```
            ┌─────────────┐
   topic →  │   Gemini    │  writes narration + a structured VIDEO SPEC (JSON):
            │  (script)   │  coordinates, route, camera beats, on-screen text,
            └──────┬──────┘  which sprites to show, music mood
                   │
                   ▼
            ┌──────────────── video spec JSON ────────────────┐
            │                                                  │
            ▼                         ▼                        ▼
   ┌────────────────┐      ┌────────────────┐       ┌──────────────────┐
   │   ai33.pro     │      │   ai33.pro     │       │     ai33.pro      │
   │   TTS → mp3    │      │  images → png  │       │  music → mp3      │
   │   + SRT/JSON   │      │  (ship, army)  │       │                  │
   │   (timing!)    │      └────────────────┘       └──────────────────┘
   └───────┬────────┘               │                        │
           │  timing drives sync    │ sprites                │ bg track
           └───────────────┬────────┴────────────────────────┘
                           ▼
                  ┌──────────────────┐
                  │     Remotion     │  React composition:
                  │  MapLibre/Mapbox │   map camera + Turf route reveal +
                  │  + Turf + audio  │   sprite + subtitles + music
                  └────────┬─────────┘
                           ▼
                     short.mp4  (1080×1920, vertical)
```

The **video spec JSON** is the contract between "generate the data" and "render
the skeleton". Everything upstream produces it; Remotion consumes it. Nail this
schema early and the two halves can be built independently.

---

## 4. The video spec (draft schema)

A single JSON object that fully describes one short. Example shape:

```jsonc
{
  "id": "voyage-of-magellan",
  "durationInFrames": 1350,        // 45s @ 30fps
  "fps": 30,
  "dimensions": { "width": 1080, "height": 1920 },
  "mapEngine": "maplibre",          // or "mapbox"
  "mapStyle": "satellite",
  "narration": {
    "audio": "assets/generated/magellan.mp3",
    "srt":   "assets/generated/magellan.srt"   // timing source of truth
  },
  "music": { "audio": "assets/generated/bg-epic.mp3", "gainDb": -18 },
  "scenes": [
    {
      "camera": { "center": [-5.0, 36.0], "zoom": 3.2, "pitch": 40, "bearing": 0 },
      "atFrame": 0,
      "transitionFrames": 60
    }
  ],
  "route": {
    "coordinates": [[-5.0,36.0], [-30,10], [-70,-54], [120,10]],
    "revealStartFrame": 90,
    "revealEndFrame": 1200,
    "sprite": { "image": "assets/generated/ship.png", "followsRoute": true }
  },
  "overlays": [
    { "text": "1519", "atFrame": 0, "durationFrames": 60, "style": "year-badge" },
    { "text": "Magellan sets sail", "atFrame": 90, "durationFrames": 120 }
  ]
}
```

Subtitles are generated automatically from the SRT, so they don't live in the
spec — they're derived at render time.

---

## 5. Proposed project structure

```
Shorts-Beta/
├── BUILD_PLAN.md          ← this file
├── .env.example           ← template (real secrets go in .env, gitignored)
├── .gitignore
├── package.json
├── remotion.config.ts
├── src/
│   ├── Root.tsx            ← registers Remotion compositions
│   ├── compositions/
│   │   └── Short.tsx       ← the main template (map + route + overlays + audio)
│   ├── map/
│   │   ├── MapLibreLayer.tsx
│   │   ├── MapboxLayer.tsx
│   │   └── useRouteReveal.ts   ← Turf slicing + camera follow
│   ├── overlays/
│   │   ├── Subtitles.tsx   ← parses SRT, renders timed captions
│   │   └── YearBadge.tsx
│   └── types/videoSpec.ts
├── pipeline/               ← the "generate the data" half (Node scripts)
│   ├── 1-script.ts         ← Gemini → video spec JSON
│   ├── 2-voice.ts          ← ai33.pro TTS → mp3 + srt
│   ├── 3-assets.ts         ← ai33.pro images → png sprites
│   ├── 4-music.ts          ← ai33.pro music → mp3
│   └── render.ts           ← stitches spec + assets, invokes Remotion render
├── specs/                  ← generated video spec JSON files
└── assets/
    ├── generated/          ← gitignored (mp3, png, mp4)
    └── samples/            ← a few committed samples for the demo render
```

---

## 6. Phased milestones

Build in this order — **do not automate before one video renders by hand.**

### Phase 0 — Project setup
- `npm create video@latest` (Remotion), add Turf, MapLibre, Mapbox, dotenv.
- Wire `.env` loading; confirm `.env` is gitignored.
- Define `types/videoSpec.ts`.

### Phase 1 — Render ONE hardcoded short (no APIs) ✅ DONE
- `Short.tsx`: vertical 1080×1920 composition. ✅
- MapLibre map with interpolated camera beats (`src/map/`). ✅
- A Turf route line that draws on (`useRouteReveal.ts`) + an inline SVG ship
  sprite following the lead point. ✅
- Title + year badge + caption overlays (`src/overlays/`). ✅
- **Renders fully offline** via a bundled `public/countries.geojson` basemap
  (flat stylized look, no tile server). ✅
- `npx remotion render src/index.ts Short out/example.mp4 --gl=swiftshader`
  produces a 12s MP4. ✅

**Learnings carried forward:** maps need WebGL → `--gl=swiftshader` in headless;
a local GeoJSON basemap avoids proxy/cert/CORS issues at render time (and matches
the plan's "no network during render" rule). Background music is deferred to
Phase 4 (ai33.pro music) rather than a committed sample.

### Phase 2 — Voiceover + timing 🟡 render side DONE / API side ready to run
- `pipeline/ai33.ts`: ai33.pro client (auth, create→poll→download, credits). ✅
- `pipeline/voice.ts` (`npm run voice`): `POST /v3/text-to-speech`
  (`with_transcript=true`) → poll `GET /v1/task/{id}/full` → download
  `audio_url` + `srt_url` into `public/narration/`. ✅ (run with your key)
- `pipeline/voice-clone.ts` (`npm run clone`): upload a sample → `clone_<id>`. ✅
- `src/lib/srt.ts` + `src/overlays/Subtitles.tsx`: parse SRT, render timed
  captions synced by fps. ✅ **verified offline** with a caption fixture.
- `Short.tsx` plays `<Audio>` + renders `<Subtitles>` when `spec.narration` set. ✅
- Camera-follow (`route.cameraFollows`) added so the ship stays framed. ✅

Remaining in Phase 2: run `npm run voice` with a real key to produce
`public/narration/example.{mp3,srt}`, point the spec at them, confirm audio↔caption
sync on a full render. (Still deciding whether to also drive camera beats from SRT
timings vs. keeping them authored in the spec.)

### Phase 3 — Generated sprites
- `pipeline/3-assets.ts`: `POST /v1i/task/generate-image` (model `bytedance-seedream-4.5`,
  e.g. `aspect_ratio:1:1`) → poll → download PNG for ship/army/flag/icon.
- Build a small **reusable sprite library** (generate once, reuse across videos).

### Phase 4 — Script generation
- `pipeline/1-script.ts`: Gemini prompt that outputs a **valid video spec JSON**
  (narration text + coordinates + camera beats + overlays). Validate against the
  TypeScript schema; reject/repair malformed output.

### Phase 5 — Full automation
- `pipeline/render.ts`: topic in → script → voice → assets → music → render → MP4 out.
- One command: `npm run make -- "the voyage of Magellan"`.

### Phase 6 — Batch + publish
- Batch a list of topics.
- (Optional) YouTube Data API upload with title/description/tags.
- (Optional) Remotion Lambda for parallel cloud rendering.

---

## 7. Key technical notes

- **Map inside Remotion:** use `delayRender()`/`continueRender()` so Remotion
  waits for the map to finish loading before capturing each frame; set the map
  `interactive: false`, `fadeDuration: 0`, hide attribution controls.
  ([Remotion maps docs](https://www.remotion.dev/docs/maps))
- **Route reveal:** use Turf to slice the line from 0 → N% based on the current
  frame; use the map's `calculateCameraOptionsFromTo()` (Mapbox) / equivalent to
  make the camera follow the leading point.
  ([Mapbox cinematic routes](https://mapbox.com/blog/building-cinematic-route-animations-with-mapboxgl))
- **Timing from SRT:** the `srt_url` from ai33.pro TTS is the single source of
  truth for when captions appear and when camera beats fire — convert SRT
  timecodes → frame numbers (`seconds * fps`).
- **Polling, not webhooks:** ai33.pro is async. A local/CLI pipeline should
  **poll `GET /v1/task/{id}/full`** rather than pass `receive_url` (webhooks need
  a public inbound endpoint). Check `GET /v1/credits` before batch runs.
- **Determinism:** rendering must be a pure function of the spec + assets (no
  network calls during `remotion render`) so frames are reproducible.

---

## 8. Cost per video (rough)
- Map: **$0** (MapLibre) or metered (Mapbox).
- Images: ~**$0** after the reusable sprite library exists.
- Script (Gemini): fractions of a cent.
- Voice + music (ai33.pro): small per-generation fee — confirm from your plan.
- Render: **$0** locally; pennies on Lambda.

→ **Well under $1/video** once the pipeline exists. The real cost is building it once.

---

## 9. Risks & caveats
- **API key hygiene:** the ai33.pro key was shared in plaintext — **rotate it**.
  All keys live in `.env` (gitignored); never commit real values.
- **ai33.pro API:** ✅ verified and captured in `docs/ai33pro-api.md` (requires the
  host `ai33.pro`/`api.ai33.pro` to be allowed in the cloud environment's network
  policy, which has been done). It's credit-billed — watch `GET /v1/credits`.
- **Mapbox ToS:** rendering map frames into downloadable video can be restricted;
  this is the main reason MapLibre is the default.
- **Originality / copyright:** replicate the *format*, not specific scripts,
  thumbnails, or exact visual assets of GeoGlobeTales. Facts aren't copyrightable;
  verbatim scripts and distinctive art are. Keep narration original.
- **Rate limits:** batch jobs can hit provider limits — add retry/backoff in the
  pipeline scripts.

---

## 10. Open questions (to confirm before Phase 2)
1. ✅ ai33.pro API — verified; see `docs/ai33pro-api.md`.
2. Preferred narration voice — which provider/voice_id? (cheap: `edge_*`/`kokoro_*`;
   premium/natural: `elevenlabs_*`) and language(s).
3. Target cadence (videos/day) — informs whether we need Lambda in Phase 6.
4. Do you want auto-upload to YouTube, or render-only for manual posting?
