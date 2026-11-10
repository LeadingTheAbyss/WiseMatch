import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from "remotion";
import { Background } from "./kit/Scene";
import { Chat, Finale, Hook, Matches, Problem, Questions, Reveal } from "./scenes";

/** Scene timeline (frames @60fps). Each scene overlaps the previous one by 24 frames for the scale-through. */
const SCENES = [
  { C: Hook, from: 0, d: 240 },
  { C: Problem, from: 216, d: 264 },
  { C: Reveal, from: 456, d: 324 },
  { C: Questions, from: 756, d: 564 },
  { C: Matches, from: 1296, d: 564 },
  { C: Chat, from: 1836, d: 624 },
  { C: Finale, from: 2436, d: 684 },
];
export const LAUNCH_FRAMES = 3120;

export const Launch: React.FC = () => (
  <AbsoluteFill>
    <Background />
    {SCENES.map(({ C, from, d }) => (
      <Sequence key={from} from={from} durationInFrames={d}>
        <C d={d} />
      </Sequence>
    ))}
    <Audio src={staticFile("hype.mp3")} volume={(f) => interpolate(f, [0, 45, LAUNCH_FRAMES - 150, LAUNCH_FRAMES], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
  </AbsoluteFill>
);
