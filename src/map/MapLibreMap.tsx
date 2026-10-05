import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  useCurrentFrame,
} from "remotion";
import type { FeatureCollection } from "geojson";
import type { VideoSpec } from "../types/videoSpec";
import {
  cameraAtFrame,
  leadPoint,
  routeProgress,
  slicedRoute,
} from "./useRouteReveal";
import { ShipSprite } from "./ShipSprite";
import { buildCountriesStyle } from "./localStyle";

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

export const MapLibreMap: React.FC<{ spec: VideoSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [initHandle] = useState(() => delayRender("maplibre: initial load"));
  const [shipPos, setShipPos] = useState<{ x: number; y: number } | null>(null);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const cam0 = cameraAtFrame(spec, 0);
    // "local-countries" → bundled offline basemap; otherwise treat as a style URL.
    const style =
      spec.mapStyleUrl === "local-countries"
        ? buildCountriesStyle()
        : spec.mapStyleUrl;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: cam0.center,
      zoom: cam0.zoom,
      pitch: cam0.pitch ?? 0,
      bearing: cam0.bearing ?? 0,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("route", { type: "geojson", data: EMPTY });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffcc00", "line-width": 6, "line-opacity": 0.95 },
      });
      setMapLoaded(true);
      continueRender(initHandle);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update camera + route + sprite for the current frame.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const handle = delayRender(`maplibre: frame ${frame}`);
    const cam = cameraAtFrame(spec, frame);
    const progress = routeProgress(spec, frame);
    // When cameraFollows is set, keep the leading point of the voyage centered
    // (zoom still comes from the camera beats) so the ship stays in frame.
    const center =
      spec.route.cameraFollows && progress > 0
        ? leadPoint(spec, progress)
        : cam.center;
    map.jumpTo({
      center,
      zoom: cam.zoom,
      pitch: cam.pitch ?? 0,
      bearing: cam.bearing ?? 0,
    });

    const src = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(slicedRoute(spec, progress));

    if (progress > 0) {
      const lp = leadPoint(spec, progress);
      const pt = map.project(lp as [number, number]);
      setShipPos({ x: pt.x, y: pt.y });
    } else {
      setShipPos(null);
    }

    const finish = () => continueRender(handle);
    map.once("idle", finish);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, mapLoaded]);

  return (
    <AbsoluteFill>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {shipPos ? (
        <div
          style={{
            position: "absolute",
            left: shipPos.x,
            top: shipPos.y,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        >
          <ShipSprite size={72} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
