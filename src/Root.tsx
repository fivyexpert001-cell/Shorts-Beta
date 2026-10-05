import { AbsoluteFill, Composition } from "remotion";
import { Short } from "./compositions/Short";
import { ShipSprite } from "./map/ShipSprite";
import { exampleSpec } from "../specs/example";

// Exports the inline SVG ship as a transparent PNG placeholder sprite:
//   npx remotion still src/index.ts ShipSpriteStill public/sprites/ship-placeholder.png
const ShipSpriteStill: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
    <ShipSprite size={240} />
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Short"
        component={Short}
        durationInFrames={exampleSpec.durationInFrames}
        fps={exampleSpec.fps}
        width={exampleSpec.width}
        height={exampleSpec.height}
        defaultProps={{ spec: exampleSpec }}
      />
      <Composition
        id="ShipSpriteStill"
        component={ShipSpriteStill}
        durationInFrames={1}
        fps={30}
        width={256}
        height={256}
      />
    </>
  );
};
