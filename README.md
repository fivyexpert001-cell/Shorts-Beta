# Shorts-Beta

Automated pipeline for faceless, map-driven geography/history YouTube Shorts
(in the style of [GeoGlobeTales](https://www.youtube.com/@GeoGlobeTales/shorts)).

**Stack:** Remotion (video engine) · MapLibre/Mapbox (animated maps) ·
Turf.js (routes) · ai33.pro (voice + images + music) · Gemini (scripts).

See **[BUILD_PLAN.md](./BUILD_PLAN.md)** for the architecture and phased build plan.

## Setup
1. `cp .env.example .env` and fill in your real API keys (`.env` is gitignored).
2. (Phase 0 onward) install deps and follow the milestones in BUILD_PLAN.md.
