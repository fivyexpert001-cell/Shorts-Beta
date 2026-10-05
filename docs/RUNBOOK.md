# End-to-end runbook

Everything you need to produce your first fully-automated short:
`topic → script → voice → sprite → render → MP4`.

---

## 1. What to gather (3 things)

| # | Value | Where to get it | Notes |
|---|-------|-----------------|-------|
| 1 | **ai33.pro API key** | ai33.pro dashboard → API | ⚠️ Rotate the one shared in chat — treat it as burned. |
| 2 | **Gemini API key** | https://aistudio.google.com/apikey | Free tier is fine to start. |
| 3 | **A voice id** | clone your own, or pick one | See step 4. For a first test, `edge_en-US-GuyNeural` needs no clone. |

You do **not** need Mapbox, fal.ai, or any other account — the map is offline and
ai33.pro covers voice + images + music.

---

## 2. Where to run it

**Recommended: your own computer.** No network-policy/proxy setup, and it's where
you'll want the finished MP4s to upload from.

- Requirements: **Node.js 20+** (`node -v`), **git**. Nothing else — Remotion
  downloads its own headless browser and bundles ffmpeg.

**Alternative: a cloud session** (like this one). Works too, but you must allow the
API hosts in the environment's **Network access** (same place you added `ai33.pro`):
add `generativelanguage.googleapis.com` (Gemini). `api.ai33.pro` / `cdn.ai33.pro`
are already covered by your `ai33.pro` allow.

---

## 3. Get the code & install

```bash
git clone -b claude/geoglobetales-channel-replication-fdf3nk \
  https://github.com/fivyexpert001-cell/Shorts-Beta.git
cd Shorts-Beta
npm install
```

---

## 4. Create `.env`

```bash
cp .env.example .env
```
Edit `.env` and set the three required values:
```
AI33PRO_API_KEY=sk_your_rotated_key
GEMINI_API_KEY=your_gemini_key
VOICE_ID=edge_en-US-GuyNeural      # or your clone / an elevenlabs voice
```

### (Optional) clone your voice first
Use a clean 1–3 min sample **of your own voice** (or one you have rights to — not
another creator's):
```bash
npm run clone -- path/to/your-sample.mp3 "My narrator"
# prints:  clone_abc123   → put VOICE_ID=clone_abc123 in .env
```

---

## 5. Run the whole pipeline

```bash
npm run make -- "The voyage of Magellan" 40
```
`40` = target seconds. Output: `out/the-voyage-of-magellan.mp4`.

What happens, in order (each also prints progress):
1. **script** — Gemini writes `specs/the-voyage-of-magellan.json` (validated).
2. **voice** — ai33.pro TTS → `public/narration/<slug>.mp3` + `.srt`.
3. **sprite** — ai33.pro image → `public/sprites/ship.png` (skipped if it exists).
4. **patch** — fills the spec's narration + sprite paths.
5. **render** — `out/<slug>.mp4` (1080×1920).

> On a machine with a GPU you can drop `--gl=swiftshader`; the pipeline sets it by
> default so it works on headless/GPU-less boxes too.

---

## 6. Run steps individually (for tweaking)

```bash
npm run script -- "Topic" 40          # regenerate just the spec
npm run voice  -- "Narration text"    # NARRATION_ID=slug to name the output
npm run sprite -- ship                # or army / flag / "custom prompt" name
npx remotion studio                   # live preview/editing in the browser
npx remotion render src/index.ts Short out/x.mp4 --props=specs/<slug>.json --gl=swiftshader
```

---

## 7. Preview & iterate

- `npm run dev` opens **Remotion Studio** — scrub the timeline, tweak, see changes live.
- Edit the generated `specs/<slug>.json` by hand to fix a coordinate, caption, or
  camera zoom, then re-render with `--props`.

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `GEMINI_API_KEY is not set` | Add it to `.env`. |
| `ai33 ... -> 401/403` | Wrong/expired ai33.pro key. Rotate & update `.env`. |
| `-> 0` credits / task error | Top up ai33.pro credits (`GET /v1/credits`). |
| Gemini host blocked (cloud) | Allow `generativelanguage.googleapis.com` in Network access. |
| `Could not find an image URL` | ai33 image result shape differs — the script prints the metadata; adjust `extractImageUrl()` in `pipeline/image.ts` (paste it to me and I'll fix). |
| map/WebGL errors on render | Keep `--gl=swiftshader` (set by default in `make`). |
| route off-screen / ship not visible | lower `camera[].zoom` or set `route.cameraFollows: true` in the spec. |

---

## 9. What's not automated yet (optional Phase 6)
Background music (ai33.pro Suno), batch rendering a topic list, and YouTube
auto-upload. Ask and these bolt onto `make`.
