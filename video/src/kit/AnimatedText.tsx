import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { easeOutExpo, springs, theme } from "../theme";

type Props = {
  /** Use \n for line breaks and *asterisks* to highlight words with the accent gradient. */
  text: string;
  size?: number;
  weight?: 300 | 500 | 700 | 800;
  color?: string;
  delay?: number;
  /** frames between words */
  stagger?: number;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  style?: React.CSSProperties;
};

/**
 * Word-by-word mask reveal: each word rises out of a clipping mask with a spring,
 * fading and blurring to sharp. Highlighted words get the gradient.
 */
export const AnimatedText: React.FC<Props> = ({ text, size = 160, weight = 800, color = theme.ink, delay = 0, stagger = 4, align = "center", lineHeight = 1.04, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let index = 0;

  const lines = text.split("\n").map((line) =>
    line
      .split(" ")
      .filter(Boolean)
      .map((raw) => ({ word: raw.replace(/\*/g, ""), hot: raw.startsWith("*") || raw.endsWith("*") })),
  );

  return (
    <div style={{ fontFamily: theme.font, fontSize: size, fontWeight: weight, lineHeight, letterSpacing: "-0.04em", color, textAlign: align, ...style }}>
      {lines.map((words, li) => (
        <div key={li} style={{ display: "flex", justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start", gap: "0.24em", flexWrap: "wrap" }}>
          {words.map(({ word, hot }, wi) => {
            const f = frame - delay - index++ * stagger;
            const p = spring({ frame: f, fps, config: springs.soft });
            const fade = interpolate(f, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutExpo });
            return (
              // the mask: padding keeps descenders and blur from being clipped
              <span key={wi} style={{ display: "inline-block", overflow: "hidden", padding: "0.1em 0.06em", margin: "-0.1em -0.06em" }}>
                <span
                  style={{
                    display: "inline-block",
                    opacity: fade,
                    transform: `translateY(${(1 - p) * 105}%)`,
                    filter: `blur(${(1 - fade) * 16}px)`,
                    willChange: "transform, opacity, filter",
                    ...(hot ? { backgroundImage: theme.gradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : null),
                  }}
                >
                  {word}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
