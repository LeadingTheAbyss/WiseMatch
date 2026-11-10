import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { easeOutExpo, springs } from "../theme";

type Props = {
  delay?: number;
  x?: number;
  y?: number;
  scale?: number;
  blur?: number;
  config?: Partial<{ damping: number; stiffness: number; mass: number }>;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/** Spring-driven entrance: slide + scale + blur-to-sharp, with an ease-out-expo fade. */
export const SpringIn: React.FC<Props> = ({ delay = 0, x = 0, y = 40, scale = 0.96, blur = 14, config = springs.soft, style, children }) => {
  const frame = useCurrentFrame() - delay;
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config });
  const fade = interpolate(frame, [0, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutExpo });
  return (
    <div
      style={{
        opacity: fade,
        filter: blur ? `blur(${blur * (1 - fade)}px)` : undefined,
        transform: `translate(${x * (1 - p)}px, ${y * (1 - p)}px) scale(${scale + (1 - scale) * p})`,
        willChange: "transform, opacity, filter",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
