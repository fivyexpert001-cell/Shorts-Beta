// Phase 3 — generate sprite images via ai33.pro image generation (Seedream).
// Usage:
//   npm run sprite -- ship                 # a built-in library prompt
//   npm run sprite -- "custom prompt" myname
//
// Outputs go to public/sprites/<name>.png so Remotion's staticFile() can serve
// them. Generate a sprite once and reuse it across many videos.
import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { credits, download, postForm, taskIdOf, waitForTask } from "./ai33";

const OUT_DIR = "public/sprites";
const MODEL = process.env.IMAGE_MODEL ?? "bytedance-seedream-4.5";

// Reusable prompts. Flat vector + transparent background so they composite
// cleanly onto the map. Tweak freely.
const LIBRARY: Record<string, string> = {
  ship:
    "A 16th-century Spanish galleon sailing ship, side profile view, flat vector illustration, bold clean outlines, transparent background, centered, no text, no watermark",
  army:
    "A group of marching medieval soldiers with spears, simple flat vector icon, transparent background, centered, no text, no watermark",
  flag:
    "A single waving flag on a pole, simple flat vector illustration, transparent background, centered, no text, no watermark",
  arrow:
    "A bold curved directional arrow marker, flat vector illustration, bright color, transparent background, centered, no text, no watermark",
  city:
    "A small walled city / castle map marker icon, flat vector illustration, transparent background, centered, no text, no watermark",
  explosion:
    "A stylized battle / explosion burst marker, flat vector illustration, transparent background, centered, no text, no watermark",
};

/** Tolerantly find the generated image URL anywhere in the task metadata. */
function extractImageUrl(meta: any): string | undefined {
  if (!meta) return undefined;
  const direct = [meta.image_url, meta.url, meta.output_url];
  for (const d of direct) if (typeof d === "string" && /^https?:/.test(d)) return d;
  for (const arr of [meta.images, meta.results, meta.outputs]) {
    if (Array.isArray(arr)) {
      for (const it of arr) {
        if (typeof it === "string" && /^https?:/.test(it)) return it;
        const u = it?.url ?? it?.image_url ?? it?.src;
        if (typeof u === "string" && /^https?:/.test(u)) return u;
      }
    }
  }
  // Deep scan as a fallback.
  const found: string[] = [];
  JSON.stringify(meta, (_k, v) => {
    if (typeof v === "string" && /^https?:\/\/.*\.(png|jpe?g|webp)(\?|$)/i.test(v)) found.push(v);
    return v;
  });
  return found[0];
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error(
      `Usage: npm run sprite -- <name|"custom prompt"> [outName]\n` +
        `  built-in names: ${Object.keys(LIBRARY).join(", ")}`
    );
    process.exit(1);
  }
  const prompt = LIBRARY[arg] ?? arg;
  const outName = process.argv[3] ?? (LIBRARY[arg] ? arg : "sprite");
  const aspect = process.env.IMAGE_ASPECT ?? "1:1";
  const resolution = process.env.IMAGE_RESOLUTION ?? "2K";

  try {
    console.log(`Credits remaining: ${await credits()}`);
  } catch {
    /* non-fatal */
  }

  const form = new FormData();
  form.append("prompt", prompt);
  form.append("model_id", MODEL);
  form.append("generations_count", "1");
  form.append("model_parameters", JSON.stringify({ aspect_ratio: aspect, resolution }));

  console.log(`Generating "${outName}" via ${MODEL} (${aspect}, ${resolution})…`);
  const created = await postForm("/v1i/task/generate-image", form);
  const taskId = taskIdOf(created);
  console.log(`Task ${taskId} created; polling…`);
  const task = await waitForTask(taskId);

  const url = extractImageUrl(task.metadata);
  if (!url) {
    throw new Error(
      `Could not find an image URL in the result. Inspect the metadata and adjust ` +
        `extractImageUrl():\n${JSON.stringify(task.metadata, null, 2).slice(0, 600)}`
    );
  }

  await mkdir(OUT_DIR, { recursive: true });
  const dest = join(OUT_DIR, `${outName}.png`);
  await download(url, dest);
  console.log(`\n✓ sprite → ${dest}`);
  console.log(`Use it in a spec:  route.sprite = { image: "sprites/${outName}.png", size: 90 }`);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
