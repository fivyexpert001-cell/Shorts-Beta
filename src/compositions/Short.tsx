import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import type { VideoSpec } from "../types/videoSpec";
import { MapLibreMap } from "../map/MapLibreMap";
import { Overlays } from "../overlays/Overlays";
import { Subtitles } from "../overlays/Subtitles";

export const Short: React.FC<{ spec: VideoSpec }> = ({ spec }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b1020" }}>
      <MapLibreMap spec={spec} />

      {/* Cinematic vignette for legibility of overlays */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />

      <Overlays spec={spec} />

      {/* Phase 2: voiceover + SRT-synced captions (optional) */}
      {spec.narration?.audioSrc ? (
        <Audio src={staticFile(spec.narration.audioSrc)} />
      ) : null}
      {spec.narration?.srtSrc ? <Subtitles src={spec.narration.srtSrc} /> : null}
    </AbsoluteFill>
  );
};
