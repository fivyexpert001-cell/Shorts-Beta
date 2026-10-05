import { interpolate } from "remotion";
import { lineString, length as turfLength, along, lineSliceAlong } from "@turf/turf";
import type { Feature, LineString } from "geojson";
import type { CameraState, LngLat, VideoSpec } from "../types/videoSpec";

/** Linearly interpolate the camera between the spec's camera beats for a frame. */
export function cameraAtFrame(spec: VideoSpec, frame: number): CameraState {
  const beats = spec.camera;
  if (beats.length === 0) throw new Error("spec.camera must have at least one beat");
  if (frame <= beats[0].atFrame) return beats[0];
  if (frame >= beats[beats.length - 1].atFrame) return beats[beats.length - 1];

  let a = beats[0];
  let b = beats[beats.length - 1];
  for (let i = 0; i < beats.length - 1; i++) {
    if (frame >= beats[i].atFrame && frame <= beats[i + 1].atFrame) {
      a = beats[i];
      b = beats[i + 1];
      break;
    }
  }
  const lerp = (from: number, to: number) =>
    interpolate(frame, [a.atFrame, b.atFrame], [from, to], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  return {
    center: [lerp(a.center[0], b.center[0]), lerp(a.center[1], b.center[1])],
    zoom: lerp(a.zoom, b.zoom),
    pitch: lerp(a.pitch ?? 0, b.pitch ?? 0),
    bearing: lerp(a.bearing ?? 0, b.bearing ?? 0),
  };
}

/** Fraction (0..1) of the route that should be revealed at this frame. */
export function routeProgress(spec: VideoSpec, frame: number): number {
  const { revealStartFrame, revealEndFrame } = spec.route;
  return interpolate(frame, [revealStartFrame, revealEndFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

const fullLine = (coords: LngLat[]): Feature<LineString> =>
  lineString(coords.map((c) => [c[0], c[1]]));

/** The revealed portion of the route as a GeoJSON LineString feature. */
export function slicedRoute(
  spec: VideoSpec,
  progress: number
): Feature<LineString> {
  const line = fullLine(spec.route.coordinates);
  const total = turfLength(line, { units: "kilometers" });
  const dist = Math.max(0.0001, total * progress);
  return lineSliceAlong(line, 0, dist, { units: "kilometers" });
}

/** Position of the leading point of the revealed route (for the moving sprite). */
export function leadPoint(spec: VideoSpec, progress: number): LngLat {
  const line = fullLine(spec.route.coordinates);
  const total = turfLength(line, { units: "kilometers" });
  const p = along(line, total * progress, { units: "kilometers" });
  const [lng, lat] = p.geometry.coordinates;
  return [lng, lat];
}
