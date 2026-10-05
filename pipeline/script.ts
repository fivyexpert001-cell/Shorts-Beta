// Phase 4 — turn a topic into a complete, validated VideoSpec using Gemini.
// Usage:  npm run script -- "The voyage of Magellan" [durationSeconds]
// Writes specs/<id>.json (validated). Then generate voice/sprites and render.
//
// Needs GEMINI_API_KEY in .env, and the host generativelanguage.googleapis.com
// allowed in the environment's network policy.
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { safeParseVideoSpec } from "../src/lib/validateSpec";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const ENDPOINT = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

const FPS = 30;

function buildPrompt(topic: string, durationSeconds: number): string {
  const frames = Math.round(durationSeconds * FPS);
  return `You are a scriptwriter for a faceless geography/history YouTube Shorts channel
(animated map, a route line drawing across it, a ship/marker moving, voiceover + captions).

Create ONE short about: "${topic}".

Return ONLY a JSON object matching this TypeScript type (no markdown, no commentary):

type LngLat = [number, number]; // [longitude, latitude]
{
  "id": string,                      // kebab-case slug of the topic
  "fps": ${FPS},
  "durationInFrames": ${frames},     // ~${durationSeconds}s at ${FPS}fps
  "width": 1080, "height": 1920,
  "mapStyleUrl": "local-countries",
  "camera": [ { "atFrame": number, "center": LngLat, "zoom": number, "pitch"?: number, "bearing"?: number } ],
  "route": {
    "coordinates": LngLat[],         // the real geographic path of the story (>= 2 points)
    "revealStartFrame": number, "revealEndFrame": number,
    "cameraFollows": true,
    "sprite": { "image": "sprites/ship.png", "size": 96 }
  },
  "overlays": [ { "kind": "title"|"year"|"caption", "text": string, "atFrame": number, "durationFrames": number } ],
  "narration": { "text": string }    // the spoken script, ~${Math.round(durationSeconds * 2.4)} words, engaging and factual
}

Rules:
- Coordinates must be accurate real-world [lng, lat] for the places in the story.
- zoom: 1.5-4 for continents/oceans, higher for a region. Keep the route on-screen.
- Keep at least 2 camera beats (start at atFrame 0, last near the end).
- One "year" badge and one "title" are typical; keep overlays short.
- narration.text is factual and original (do not copy any existing script).
- durationInFrames MUST equal ${frames}.`;
}

async function callGemini(prompt: string, key: string): Promise<string> {
  const res = await fetch(ENDPOINT(MODEL, key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
    }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${raw.slice(0, 400)}`);
  const data = JSON.parse(raw);
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
  if (!text) throw new Error(`Empty Gemini response: ${raw.slice(0, 400)}`);
  return text;
}

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned);
}

async function main() {
  const topic = process.argv[2];
  const durationSeconds = Number(process.argv[3] ?? 40);
  if (!topic) {
    console.error('Usage: npm run script -- "Topic" [durationSeconds]');
    process.exit(1);
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("GEMINI_API_KEY is not set — add it to .env");
    process.exit(1);
  }

  let prompt = buildPrompt(topic, durationSeconds);
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    console.log(`Asking ${MODEL} for a spec (attempt ${attempt})…`);
    const text = await callGemini(prompt, key);
    let parsedJson: unknown;
    try {
      parsedJson = extractJson(text);
    } catch (e: any) {
      lastErr = `Response was not valid JSON: ${e.message}`;
      prompt = buildPrompt(topic, durationSeconds) + `\n\nYour previous reply was not valid JSON. Return ONLY the JSON object.`;
      continue;
    }
    const result = safeParseVideoSpec(parsedJson);
    if (result.success) {
      const spec = result.data;
      await mkdir("specs", { recursive: true });
      const dest = join("specs", `${spec.id}.json`);
      await writeFile(dest, JSON.stringify(spec, null, 2));
      console.log(`\n✓ spec → ${dest}`);
      console.log(`  ${spec.camera.length} camera beats, ${spec.route.coordinates.length} route points, ${spec.overlays.length} overlays`);
      console.log(`\nNarration:\n${spec.narration?.text ?? "(none)"}`);
      console.log(`\nNext:`);
      console.log(`  NARRATION_ID=${spec.id} npm run voice -- "${(spec.narration?.text ?? "").replace(/"/g, "'").slice(0, 60)}…"`);
      console.log(`  (then set narration.audioSrc/srtSrc in ${dest} and render with --props=${dest})`);
      return;
    }
    lastErr = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    console.warn(`  invalid spec: ${lastErr}`);
    prompt =
      buildPrompt(topic, durationSeconds) +
      `\n\nYour previous reply failed validation with: ${lastErr}\nFix those fields and return ONLY the corrected JSON.`;
  }
  console.error(`✗ Could not get a valid spec after 2 attempts. Last error: ${lastErr}`);
  process.exit(1);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
