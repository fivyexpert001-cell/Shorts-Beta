import React from "react";
import { AbsoluteFill } from "remotion";
import type { VideoSpec } from "../types/videoSpec";
import { MapLibreMap } from "../map/MapLibreMap";
import { Overlays } from "../overlays/Overlays";

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
    </AbsoluteFill>
  );
};
