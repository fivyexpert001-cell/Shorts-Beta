// Tiny SRT parser: text -> timed cues (seconds). Used to sync captions to the
// ai33.pro TTS output.
export interface Cue {
  index: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
}

function timecodeToSeconds(tc: string): number {
  const m = tc.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!m) return 0;
  const [, h, mn, s, ms] = m;
  return Number(h) * 3600 + Number(mn) * 60 + Number(s) + Number(ms) / 1000;
}

export function parseSrt(raw: string): Cue[] {
  const blocks = raw.replace(/\r/g, "").trim().split(/\n\s*\n/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.length > 0);
    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) continue;
    const [a, b] = timeLine.split("-->");
    const maybeIndex = parseInt(lines[0], 10);
    const textLines = lines.slice(lines.indexOf(timeLine) + 1);
    if (textLines.length === 0) continue;
    cues.push({
      index: Number.isNaN(maybeIndex) ? cues.length + 1 : maybeIndex,
      start: timecodeToSeconds(a),
      end: timecodeToSeconds(b),
      text: textLines.join("\n"),
    });
  }
  return cues;
}
