import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { parseSrt, type Cue } from "../lib/srt";

// Loads an SRT (from public/ via staticFile) and renders the active caption,
// synced to the audio by the composition's fps.
export const Subtitles: React.FC<{ src: string }> = ({ src }) => {
  const [cues, setCues] = useState<Cue[]>([]);
  const [handle] = useState(() => delayRender("load srt"));
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useEffect(() => {
    let cancelled = false;
    fetch(staticFile(src))
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setCues(parseSrt(text));
      })
      .catch(() => {})
      .finally(() => continueRender(handle));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const t = frame / fps;
  const active = cues.find((c) => t >= c.start && t < c.end);
  if (!active) return null;

  const since = t - active.start;
  const opacity = interpolate(since, [0, 0.12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end" }}>
      <div
        style={{
          opacity,
          maxWidth: 920,
          margin: "0 60px 360px",
          padding: "20px 34px",
          textAlign: "center",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          fontSize: 56,
          fontWeight: 800,
          lineHeight: 1.25,
          color: "#ffffff",
          background: "rgba(0,0,0,0.6)",
          borderRadius: 20,
          whiteSpace: "pre-line",
          textShadow: "0 2px 10px rgba(0,0,0,0.9)",
        }}
      >
        {active.text}
      </div>
    </AbsoluteFill>
  );
};
