// Phase 2 — generate narration (audio + SRT) via ai33.pro TTS.
// Usage:  npm run voice -- "Narration text here" [voice_id]
//   voice_id defaults to $VOICE_ID (e.g. clone_xxx, elevenlabs_xxx, edge_en-US-GuyNeural)
//
// Outputs land in public/narration/<id>.{mp3,srt} so Remotion's staticFile() can
// serve them. Point specs/*.ts `narration` at those paths.
import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { credits, download, postForm, taskIdOf, waitForTask } from "./ai33";

const OUT_DIR = "public/narration";

async function main() {
  const text = process.argv[2];
  const voiceId = process.argv[3] ?? process.env.VOICE_ID;
  const id = process.env.NARRATION_ID ?? "narration";

  if (!text) {
    console.error('Usage: npm run voice -- "Narration text" [voice_id]');
    process.exit(1);
  }
  if (!voiceId) {
    console.error(
      "No voice id. Pass one as the 2nd arg or set VOICE_ID in .env\n" +
        "  (e.g. clone_xxx, elevenlabs_xxx, edge_en-US-GuyNeural)"
    );
    process.exit(1);
  }

  try {
    console.log(`Credits remaining: ${await credits()}`);
  } catch {
    /* non-fatal */
  }

  const form = new FormData();
  form.append("text", text);
  form.append("voice_id", voiceId);
  form.append("speed", process.env.VOICE_SPEED ?? "1");
  form.append("with_transcript", "true"); // needed so the task produces an SRT

  console.log(`Requesting TTS with voice "${voiceId}"…`);
  const created = await postForm("/v3/text-to-speech", form);
  const taskId = taskIdOf(created);
  console.log(`Task ${taskId} created; polling until done…`);
  const task = await waitForTask(taskId);

  const audioUrl = task.metadata?.audio_url;
  const srtUrl = task.metadata?.srt_url;
  if (!audioUrl) {
    throw new Error(`no audio_url in result metadata: ${JSON.stringify(task.metadata)}`);
  }

  await mkdir(OUT_DIR, { recursive: true });
  await download(audioUrl, join(OUT_DIR, `${id}.mp3`));
  console.log(`\n✓ audio → ${OUT_DIR}/${id}.mp3`);

  if (srtUrl) {
    await download(srtUrl, join(OUT_DIR, `${id}.srt`));
    console.log(`✓ srt   → ${OUT_DIR}/${id}.srt`);
    console.log(
      `\nNext: in your spec set  narration: { audioSrc: "narration/${id}.mp3", srtSrc: "narration/${id}.srt" }`
    );
  } else {
    console.warn("\n⚠ No srt_url returned — captions won't be available for this clip.");
  }
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
