# ai33.pro (OpenSpeaker) API reference

Extracted and verified from the live API-docs app (`https://ai33.pro/app/api-document`)
on 2026-10-05. ai33.pro is an aggregator over ElevenLabs, MiniMax, Fish Audio,
Vbee, Microsoft Edge, Kokoro, Suno, and ByteDance Seedream.

> Only the endpoints this project uses are documented in depth; the rest are
> listed for reference. Confirm against the live docs if behavior changes.

## Base URL & auth

- **Base URL:** `https://api.ai33.pro`
- **Auth header:** `xi-api-key: <YOUR_API_KEY>` (ElevenLabs-style; **not** `Authorization: Bearer`)
- Endpoint families by prefix (all on the same host):
  - `/v3/...` — text-to-speech, voices, voice-clone, dictionaries (current gen)
  - `/v1/...` — dubbing, speech-to-text, sound-effect, voice-changer/isolate, tasks, uploads, credits, health
  - `/v1i/...` — image generation
  - `/v1s/...` — Suno music generation

## The async task model (important)

Almost everything is asynchronous:

1. **Create** a task → `POST` an endpoint → response returns a `task_id`.
2. **Poll** `GET /v1/task/{task_id}` (or `/v1/task/{task_id}/full` for full detail)
   until `status` is `"done"` (other states: `"doing"`, `"error"`).
3. **Read results** from the completed task's `metadata` (e.g. `audio_url`, `srt_url`).
4. Alternatively pass `receive_url` on create for a **webhook** callback instead of polling.

Task response shape:
```jsonc
{
  "id": "uuid_task_id",
  "created_at": "2026-01-01T00:00:00.000Z",
  "status": "doing",            // "doing" | "done" | "error"
  "error_message": null,
  "credit_cost": 1,
  "progress": 60,               // 0-100
  "type": "tts",                // tts | dubbing | imagen2 | suno_music | ...
  "metadata": { /* result URLs appear here when done */ }
}
```

---

## Text-to-Speech (primary) — `POST /v3/text-to-speech`

Send **multipart/form-data**.

| Field | Required | Notes |
|-------|----------|-------|
| `voice_id` | ✅ | **Must have a provider prefix:** `elevenlabs_`, `minimax_`, `clone_`, `edge_`, `kokoro_`, `vbee_`, `fishaudio_` |
| `text` | ✅ | Max 1,000,000 chars |
| `speed` | — | 0.5–1.5 (default 1) |
| `with_transcript` | — | default `false`. Set **`true`** to get timing/transcript output |
| `file_name` | — | output filename |
| `receive_url` | — | webhook callback |
| `pronunciation_dictionary_id` | — | apply a pronunciation dictionary |

> For `edge_` and `kokoro_` voices, `language`/`similarity` are not sent (they're the
> cheapest tiers — Microsoft Edge neural voices and Kokoro). Premium tiers
> (elevenlabs/minimax/fishaudio) take extra params.

```bash
curl -X POST "https://api.ai33.pro/v3/text-to-speech" \
  -H "xi-api-key: $API_KEY" \
  -F text="Magellan set sail in 1519." \
  -F voice_id="edge_en-US-GuyNeural" \
  -F speed="1" \
  -F with_transcript="true" \
  -F receive_url="https://your-site.com/api/callback"
```

**Completed task metadata includes `audio_url` and `srt_url`:**
```jsonc
{
  "status": "done",
  "type": "tts",
  "metadata": {
    "audio_url": "https://cdn.ai33.pro/.../speech.mp3",
    "srt_url":   "https://cdn.ai33.pro/.../speech.srt"   // ← timing source for sync
  }
}
```

👉 **This `srt_url` is what drives subtitle + camera-beat timing in Remotion.**
Set `with_transcript=true`, poll until done, download the SRT, convert timecodes
to frame numbers (`seconds * fps`).

### List voices — `GET /v3/voices`
```bash
curl "https://api.ai33.pro/v3/voices?provider=edge&language=English&gender=Male" \
  -H "xi-api-key: $API_KEY"
```
Query: `provider` required (`elevenlabs|minimax|clone|edge|kokoro|vbee|fishaudio`);
optional `search`/`q`, `page`, `page_size`/`limit` (max 100), CSV filters
`language`, `locale`, `gender`, `age`, `accent`, `category`, `use_case`, `style`.

### Multi-speaker dialogue — `POST /v3/text-to-speech/dialogue`
FormData: `text` (lines prefixed `A>`, `B>`, …), `speakers` (JSON array, min 2,
each `{voice_id, speed?}`), `delay`, `with_transcript`.

### Voice clone — `POST /v3/text-to-speech/voice-clone`
FormData: `voice_name`, `audio_file` (max 10MB). Returns `data.voice_id`; use as
`clone_<voice_id>`. Delete: `DELETE /v3/text-to-speech/voice-clone/{id}`.

### Pronunciation dictionaries — `/v3/dictionaries`
`POST` `{name, rules:[{from,to,matchType,caseSensitive}]}` (`matchType`=`word|contains`).
Also `GET` list, `GET/PUT/DELETE /v3/dictionaries/{id}`, `POST /v3/dictionaries/preview`.

---

## Image generation — `POST /v1i/task/generate-image`

Send **multipart/form-data**. **Seedream is available here** (`bytedance-seedream-4.5`).

| Field | Required | Notes |
|-------|----------|-------|
| `prompt` | ✅ | Reference images with `@img1`, `@img2` in the text |
| `model_id` | ✅ | e.g. `bytedance-seedream-4.5` (see `GET /v1i/models`) |
| `generations_count` | — | default 1 |
| `model_parameters` | — | JSON, e.g. `{"aspect_ratio":"16:9","resolution":"2K"}` |
| `assets` | — | reference image files (repeat the field; map to `@img1`, `@img2`…) |
| `receive_url` | — | webhook |

```bash
curl -X POST "https://api.ai33.pro/v1i/task/generate-image" \
  -H "xi-api-key: $API_KEY" \
  -F 'prompt=A 16th-century Spanish galleon, side view, transparent background, flat vector style' \
  -F 'model_id=bytedance-seedream-4.5' \
  -F 'generations_count=1' \
  -F 'model_parameters={"aspect_ratio":"1:1","resolution":"2K"}'
```

- **List image models:** `GET /v1i/models` → `{success, models:[{model_id, max_generations,
  aspect_ratios, resolutions, supports_images, ...}]}`. Seedream 4.5 supports
  aspect ratios `16:9 4:3 1:1 3:4 9:16` and resolutions `2K`/`4K`.
- **Price quote:** `POST /v1i/task/price` with `{model_id, generations_count, model_parameters, assets}`.
- Poll the created task (`type: "imagen2"`) for the result image URL(s).

---

## Music — `POST /v1s/task/music-generation` (Suno)

JSON body. Returns `task_id`; poll (`type: "suno_music"`). Preview streams may
appear at `metadata.stream_url` while processing; final URLs when `status=done`.

- **Simple:** `{create_mode:"simple", gpt_description_prompt:"...", make_instrumental:bool, receive_url?}`
- **Custom:** `{create_mode:"custom", title, lyrics, tags, vocal_gender:"f"|"m", receive_url?}`

```bash
curl -X POST "https://api.ai33.pro/v1s/task/music-generation" \
  -H "Content-Type: application/json" \
  -H "xi-api-key: $API_KEY" \
  -d '{"create_mode":"simple","gpt_description_prompt":"epic cinematic orchestral, adventurous","make_instrumental":true}'
```

---

## Other endpoints (reference)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/task/dubbing` | POST | Dub an audio/video file into another language (FormData `file` or JSON `upload_id`; `target_lang`, `voice_id`, `num_speakers`, …) |
| `/v1/task/speech-to-text` | POST | Transcribe audio (FormData `file`, `tag_audio_events`) |
| `/v1/task/sound-effect` | POST | SFX from text (`text`, `duration_seconds`, `prompt_influence`, `loop`, `model_id`) |
| `/v1/task/voice-changer` | POST | Change voice of an audio file |
| `/v1/task/voice-isolate` | POST | Isolate voice from audio |
| `/v1/uploads` | POST | Presigned upload → `upload_id` for large-file JSON requests |
| `/v1/task/{task_id}` · `/full` | GET | Poll a task / full detail |
| `/v1/tasks?page=&limit=&type=` | GET | List tasks (type e.g. `tts`, `imagen2`, `suno_music`) |
| `/v1/task/delete` | POST | `{task_ids:[...]}` → may refund credits |
| `/v1/credits` | GET | `{success, credits}` — remaining balance |
| `/v1/health-check` | GET | Per-provider status (`good`/`degraded`/`overloaded`) |

---

## Notes for this project
- Billing is **credit-based** (`credit_cost` per task; `GET /v1/credits` for balance).
  Check `/v1/credits` before batch runs; `/v1/health-check` to avoid overloaded providers.
- **Cheapest voice:** `edge_*` (Microsoft) or `kokoro_*`. Premium/natural: `elevenlabs_*`.
- **Webhook vs poll:** `receive_url` needs a public endpoint. For a local/CLI pipeline,
  **polling `/v1/task/{task_id}/full`** is simpler — no inbound server required.
- CDN output lives on `https://cdn.ai33.pro/...`.
