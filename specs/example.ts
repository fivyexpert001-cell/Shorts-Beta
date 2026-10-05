import type { VideoSpec } from "../src/types/videoSpec";

// Phase 1 hardcoded example: a (very rough) sketch of Magellan's voyage.
// Coordinates are illustrative, not historically precise.
const FPS = 30;
const DURATION_SECONDS = 12;

export const exampleSpec: VideoSpec = {
  id: "voyage-example",
  fps: FPS,
  durationInFrames: FPS * DURATION_SECONDS,
  width: 1080,
  height: 1920,
  // "local-countries" = the bundled offline GeoJSON basemap (public/countries.geojson),
  // no tile server needed. Set MAP_STYLE_URL to a real style URL to use tiles instead.
  mapStyleUrl: process.env.MAP_STYLE_URL ?? "local-countries",
  camera: [
    { atFrame: 0, center: [-6, 36], zoom: 2.4, pitch: 0, bearing: 0 },
    { atFrame: FPS * 11, center: [100, 5], zoom: 2.2, pitch: 0, bearing: 0 },
  ],
  route: {
    coordinates: [
      [-6.0, 36.0], // Spain
      [-17.0, 14.0], // West Africa
      [-43.0, -23.0], // Brazil
      [-70.0, -54.0], // Cape Horn
      [-120.0, 0.0], // Pacific
      [147.0, 13.0], // Guam
      [123.0, 11.0], // Philippines
    ],
    revealStartFrame: FPS * 1,
    revealEndFrame: FPS * 11,
    cameraFollows: true, // keep the ship framed; set false for a world-pan look
    // Generated sprite path (public/sprites/...). Falls back to the inline SVG
    // ship if the file is missing. Replace with a Seedream sprite:
    //   npm run sprite -- ship   →   image: "sprites/ship.png"
    sprite: { image: "sprites/ship-placeholder.png", size: 96 },
  },
  overlays: [
    { kind: "year", text: "1519", atFrame: 0, durationFrames: FPS * 3 },
    {
      kind: "title",
      text: "The First Voyage\nAround the World",
      atFrame: FPS * 1,
      durationFrames: FPS * 4,
    },
  ],
  // Captions come from an SRT. This fixture lets you preview caption rendering
  // offline. Once you run `npm run voice`, point these at the generated files:
  //   audioSrc: "narration/example.mp3", srtSrc: "narration/example.srt"
  narration: {
    srtSrc: "sample-captions.srt",
  },
};
