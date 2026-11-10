import React from "react";
import { Composition } from "remotion";
import { LAUNCH_FRAMES, Launch } from "./Launch";
import { Test5s } from "./Test5s";
import { theme } from "./theme";
import "./index.css";

export const Root: React.FC = () => (
  <>
    <Composition id="Launch" component={Launch} durationInFrames={LAUNCH_FRAMES} fps={theme.fps} width={theme.width} height={theme.height} />
    <Composition id="Test5s" component={Test5s} durationInFrames={300} fps={theme.fps} width={theme.width} height={theme.height} />
  </>
);
