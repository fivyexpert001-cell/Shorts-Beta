import { Config } from "@remotion/cli/config";

// MapLibre draws with WebGL. In a headless/cloud container there's usually no
// GPU, so use SwiftShader (software GL) to render WebGL reliably.
Config.setChromiumOpenGlRenderer("swiftshader");

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Maps need network (tiles) + WebGL; give frames room to settle.
Config.setDelayRenderTimeoutInMilliseconds(60000);
