import { staticFile } from "remotion";
import type { StyleSpecification } from "maplibre-gl";

// A self-contained MapLibre style: a bundled world-countries GeoJSON drawn as
// flat fills + borders. No tile server, no glyphs/sprites → renders fully
// offline and deterministically (the flat stylized look GeoGlobeTales uses).
export const buildCountriesStyle = (): StyleSpecification => ({
  version: 8,
  sources: {
    countries: {
      type: "geojson",
      data: staticFile("countries.geojson"),
    },
  },
  layers: [
    { id: "ocean", type: "background", paint: { "background-color": "#0f2743" } },
    {
      id: "land",
      type: "fill",
      source: "countries",
      paint: { "fill-color": "#35543f" },
    },
    {
      id: "borders",
      type: "line",
      source: "countries",
      paint: {
        "line-color": "#0c1c2e",
        "line-width": 0.7,
        "line-opacity": 0.6,
      },
    },
  ],
});
