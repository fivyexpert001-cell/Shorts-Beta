import { Composition } from "remotion";
import { Short } from "./compositions/Short";
import { exampleSpec } from "../specs/example";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Short"
      component={Short}
      durationInFrames={exampleSpec.durationInFrames}
      fps={exampleSpec.fps}
      width={exampleSpec.width}
      height={exampleSpec.height}
      defaultProps={{ spec: exampleSpec }}
    />
  );
};
