// Phase 2 — clone a voice from an audio sample.
// Usage:  npm run clone -- path/to/sample.mp3 "My narrator"
//
// ⚠️ Clone only a voice you have the right to use (your own, or one with
// explicit permission). Do NOT clone another creator's narrator to impersonate
// them — it can violate ai33.pro/ElevenLabs/YouTube terms and the person's rights.
import "dotenv/config";
import { appendFile, postForm } from "./ai33";

async function main() {
  const sample = process.argv[2];
  const voiceName = process.argv[3] ?? "My cloned voice";
  if (!sample) {
    console.error('Usage: npm run clone -- path/to/sample.mp3 "Voice name"');
    process.exit(1);
  }

  const form = new FormData();
  form.append("voice_name", voiceName);
  await appendFile(form, "audio_file", sample); // max 10MB

  console.log(`Uploading "${sample}" to clone as "${voiceName}"…`);
  const resp = await postForm("/v3/text-to-speech/voice-clone", form);
  const voiceId = resp?.data?.voice_id ?? resp?.voice_id;
  if (!voiceId) throw new Error(`no voice_id in response: ${JSON.stringify(resp).slice(0, 200)}`);

  console.log(`\n✓ Cloned. Your voice id (use the clone_ prefix everywhere):\n`);
  console.log(`    clone_${voiceId}\n`);
  console.log(`Add it to .env so the pipeline uses it by default:`);
  console.log(`    VOICE_ID=clone_${voiceId}`);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
