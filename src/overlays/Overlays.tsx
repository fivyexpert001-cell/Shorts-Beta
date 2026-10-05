import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";
import type { Overlay, VideoSpec } from "../types/videoSpec";

const FONT =
  "'Archivo Black', 'Arial Black', system-ui, -apple-system, sans-serif";

const fadeInOut = (frame: number, duration: number) =>
  interpolate(
    frame,
    [0, 12, duration - 12, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

const YearBadge: React.FC<{ text: string; duration: number }> = ({
  text,
  duration,
}) => {
  const frame = useCurrentFrame();
  const opacity = fadeInOut(frame, duration);
  const y = interpolate(frame, [0, 16], [30, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start" }}>
      <div
        style={{
          marginTop: 180,
          transform: `translateY(${y}px)`,
          opacity,
          fontFamily: FONT,
          fontSize: 120,
          fontWeight: 900,
          color: "#ffcc00",
          letterSpacing: 4,
          textShadow: "0 6px 24px rgba(0,0,0,0.7)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

const TitleCard: React.FC<{ text: string; duration: number }> = ({
  text,
  duration,
}) => {
  const frame = useCurrentFrame();
  const opacity = fadeInOut(frame, duration);
  const y = interpolate(frame, [0, 18], [40, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          transform: `translateY(${y}px)`,
          opacity,
          fontFamily: FONT,
          fontSize: 92,
          fontWeight: 900,
          lineHeight: 1.05,
          color: "#ffffff",
          textAlign: "center",
          padding: "0 70px",
          whiteSpace: "pre-line",
          textShadow: "0 6px 28px rgba(0,0,0,0.85)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ text: string; duration: number }> = ({
  text,
  duration,
}) => {
  const frame = useCurrentFrame();
  const opacity = fadeInOut(frame, duration);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end" }}>
      <div
        style={{
          marginBottom: 300,
          opacity,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 54,
          fontWeight: 700,
          color: "#ffffff",
          textAlign: "center",
          padding: "20px 40px",
          margin: "0 50px 300px",
          background: "rgba(0,0,0,0.55)",
          borderRadius: 18,
          textShadow: "0 2px 10px rgba(0,0,0,0.8)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

const renderOverlay = (o: Overlay) => {
  switch (o.kind) {
    case "year":
      return <YearBadge text={o.text} duration={o.durationFrames} />;
    case "title":
      return <TitleCard text={o.text} duration={o.durationFrames} />;
    case "caption":
    default:
      return <Caption text={o.text} duration={o.durationFrames} />;
  }
};

export const Overlays: React.FC<{ spec: VideoSpec }> = ({ spec }) => {
  return (
    <AbsoluteFill>
      {spec.overlays.map((o, i) => (
        <Sequence
          key={i}
          from={o.atFrame}
          durationInFrames={o.durationFrames}
          layout="none"
        >
          {renderOverlay(o)}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
