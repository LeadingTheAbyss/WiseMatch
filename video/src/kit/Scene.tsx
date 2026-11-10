import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { easeOutExpo, theme } from "../theme";

/** White canvas with slow-drifting lavender glows and a faint grain, so nothing is ever flat. */
export const Background: React.FC = () => {
  const f = useCurrentFrame();
  const a = Math.sin(f / 170) * 90;
  const b = Math.cos(f / 210) * 110;
  const grain =
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .24  0 0 0 0 .1  0 0 0 0 .5  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(900px 620px at ${78 + a / 40}% ${8 + b / 60}%, rgba(139,92,246,0.20), transparent 70%), radial-gradient(760px 560px at ${10 + b / 50}% ${96 + a / 80}%, rgba(196,181,253,0.28), transparent 70%)` }} />
      <AbsoluteFill style={{ backgroundImage: grain, opacity: 0.07, mixBlendMode: "multiply" }} />
    </AbsoluteFill>
  );
};

/** Slow continuous camera: every scene scales 1.0 -> 1.05 (or your range) and drifts. */
export const Drift: React.FC<{ duration: number; from?: number; to?: number; panX?: number; panY?: number; origin?: string; children: React.ReactNode }> = ({ duration, from = 1, to = 1.05, panX = 0, panY = 0, origin = "50% 50%", children }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, duration], [0, 1], { extrapolateRight: "clamp", easing: (x) => x });
  return (
    <AbsoluteFill style={{ transformOrigin: origin, transform: `translate(${panX * p}px, ${panY * p}px) scale(${from + (to - from) * p})` }}>{children}</AbsoluteFill>
  );
};

/**
 * Scale-through transition: the outgoing scene scales up and blurs away while the
 * incoming one grows into place from slightly smaller. Wrap each scene in this.
 */
export const ScaleThrough: React.FC<{ duration: number; inFrames?: number; outFrames?: number; first?: boolean; last?: boolean; children: React.ReactNode }> = ({ duration, inFrames = 24, outFrames = 24, first, last, children }) => {
  const f = useCurrentFrame();
  const enter = first ? 1 : interpolate(f, [0, inFrames], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  const exit = last ? 0 : interpolate(f, [duration - outFrames, duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => x * x });
  const scale = (first ? 1 : 0.86 + 0.14 * enter) * (1 + exit * 0.7);
  return (
    <AbsoluteFill style={{ opacity: enter * (1 - exit), transform: `scale(${scale})`, filter: `blur(${(1 - enter) * 10 + exit * 14}px)` }}>{children}</AbsoluteFill>
  );
};
