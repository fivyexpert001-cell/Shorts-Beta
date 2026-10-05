import { z } from "zod";
import type { VideoSpec } from "../types/videoSpec";

// Runtime schema for a VideoSpec — used to validate Gemini's output (Phase 4)
// before it's written to disk / rendered. Kept in sync with types/videoSpec.ts.
const LngLat = z.tuple([z.number(), z.number()]);

const CameraBeat = z.object({
  atFrame: z.number(),
  center: LngLat,
  zoom: z.number(),
  pitch: z.number().optional(),
  bearing: z.number().optional(),
});

const Overlay = z.object({
  kind: z.enum(["title", "year", "caption"]),
  text: z.string(),
  atFrame: z.number(),
  durationFrames: z.number(),
});

const Sprite = z.object({
  image: z.string().optional(),
  size: z.number().optional(),
});

const Route = z.object({
  coordinates: z.array(LngLat).min(2),
  revealStartFrame: z.number(),
  revealEndFrame: z.number(),
  cameraFollows: z.boolean().optional(),
  sprite: Sprite.optional(),
});

const Narration = z.object({
  text: z.string().optional(),
  audioSrc: z.string().optional(),
  srtSrc: z.string().optional(),
});

export const VideoSpecSchema = z.object({
  id: z.string().min(1),
  fps: z.number().positive(),
  durationInFrames: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  mapStyleUrl: z.string().min(1),
  camera: z.array(CameraBeat).min(1),
  route: Route,
  overlays: z.array(Overlay),
  narration: Narration.optional(),
});

/** Validate unknown data as a VideoSpec (throws a readable error if invalid). */
export function parseVideoSpec(data: unknown): VideoSpec {
  return VideoSpecSchema.parse(data) as VideoSpec;
}

/** Non-throwing variant returning zod's SafeParse result. */
export const safeParseVideoSpec = (data: unknown) => VideoSpecSchema.safeParse(data);
