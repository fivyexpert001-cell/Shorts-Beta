// Phase 5 — one command: topic -> finished MP4.
// Usage:  npm run make -- "The voyage of Magellan" [durationSeconds]
//
// Chains the other steps (each is independently runnable too):
//   1. script  (Gemini)     -> specs/<slug>.json
//   2. voice   (ai33.pro)   -> public/narration/<slug>.{mp3,srt}
//   3. sprite  (ai33.pro)   -> public/sprites/ship.png   (reused if present)
//   4. patch the spec with narration + sprite paths
//   5. render  (Remotion)   -> out/<slug>.mp4
//
// Needs GEMINI_API_KEY + AI33PRO_API_KEY in .env, VOICE_ID set, and the hosts
// generativelanguage.googleapis.com and api.ai33.pro allowed by the network policy.
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseVideoSpec } from "../src/lib/validateSpec";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function run(cmd: string, args: string[], env: Record<string, string> = {}) {
  console.log(`\n▶ ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });
  if (res.status !== 0) throw new Error(`step failed: ${cmd} ${args[1] ?? ""} (exit ${res.status})`);
}

function main() {
  const topic = process.argv[2];
  const seconds = String(Number(process.argv[3] ?? 40));
  if (!topic) {
    console.error('Usage: npm run make -- "Topic" [durationSeconds]');
    process.exit(1);
  }
  const slug = slugify(topic);
  const specPath = join("specs", `${slug}.json`);
  const spriteName = process.env.SPRITE ?? "ship";
  const spritePath = join("public", "sprites", `${spriteName}.png`);

  // 1. Gemini → spec
  run("npx", ["tsx", "pipeline/script.ts", topic, seconds], { SPEC_ID: slug });

  // Read the narration text the model wrote.
  const spec = parseVideoSpec(JSON.parse(readFileSync(specPath, "utf8")));
  const narrationText = spec.narration?.text;
  if (!narrationText) throw new Error(`spec ${specPath} has no narration.text`);

  // 2. ai33.pro → voice (audio + srt)
  run("npx", ["tsx", "pipeline/voice.ts", narrationText], { NARRATION_ID: slug });

  // 3. ai33.pro → sprite (reuse if already generated)
  if (existsSync(spritePath)) {
    console.log(`\n▶ sprite ${spritePath} already exists — reusing`);
  } else {
    run("npx", ["tsx", "pipeline/image.ts", spriteName, spriteName]);
  }

  // 4. Patch the spec with the generated asset paths, then re-validate.
  spec.narration = {
    ...spec.narration,
    audioSrc: `narration/${slug}.mp3`,
    srtSrc: `narration/${slug}.srt`,
  };
  spec.route.sprite = { ...(spec.route.sprite ?? {}), image: `sprites/${spriteName}.png`, size: spec.route.sprite?.size ?? 96 };
  parseVideoSpec(spec); // throws if we broke it
  writeFileSync(specPath, JSON.stringify(spec, null, 2));
  console.log(`\n✓ patched ${specPath} with narration + sprite`);

  // 5. Render
  const out = join("out", `${slug}.mp4`);
  run("npx", ["remotion", "render", "src/index.ts", "Short", out, `--props=${specPath}`, "--gl=swiftshader"]);

  console.log(`\n🎬 Done → ${out}`);
}

try {
  main();
} catch (e: any) {
  console.error("✗", e.message);
  process.exit(1);
}
