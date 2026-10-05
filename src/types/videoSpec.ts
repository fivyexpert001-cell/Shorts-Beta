// The "video spec" is the contract between the pipeline (which generates data)
// and Remotion (which renders it). Phase 1 uses a hardcoded example; later
// phases will have Gemini produce this JSON.

export type LngLat = [number, number];

export interface CameraState {
  center: LngLat;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export interface CameraBeat extends CameraState {
  /** Frame at which the camera should be at this state. */
  atFrame: number;
}

export interface RouteSpec {
  coordinates: LngLat[];
  revealStartFrame: number;
  revealEndFrame: number;
  /** If true, the camera follows the leading point of the revealed route. */
  cameraFollows?: boolean;
}

export interface Overlay {
  text: string;
  atFrame: number;
  durationFrames: number;
  kind: "title" | "year" | "caption";
}

export interface VideoSpec {
  id: string;
  fps: number;
  durationInFrames: number;
  width: number;
  height: number;
  /** MapLibre style URL (or Mapbox style when wired in a later phase). */
  mapStyleUrl: string;
  camera: CameraBeat[];
  route: RouteSpec;
  overlays: Overlay[];
}
