import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

type Props = {
  /** outer size on screen */
  width: number;
  /** native size the UI inside is designed at; it is scaled to fit the frame */
  innerWidth: number;
  innerHeight: number;
  /** gentle floating bob in px, and tilt in degrees */
  float?: number;
  tilt?: { x?: number; y?: number };
  children: React.ReactNode;
};

const BAR = 48;

/** A floating rounded window with soft shadow and a subtle purple glow. */
export const DeviceFrame: React.FC<Props> = ({ width, innerWidth, innerHeight, float = 10, tilt, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const scale = width / innerWidth;
  const height = innerHeight * scale + BAR;
  const bob = Math.sin(t * 1.4) * float;

  return (
    <div style={{ position: "relative", width, height, transform: `translateY(${bob}px) perspective(2400px) rotateX(${tilt?.x ?? 0}deg) rotateY(${tilt?.y ?? 0}deg)` }}>
      {/* glow */}
      <div style={{ position: "absolute", inset: -80, borderRadius: 120, background: "radial-gradient(closest-side, rgba(139,92,246,0.32), transparent 70%)", filter: "blur(40px)" }} />
      <div
        style={{
          position: "relative",
          width,
          height,
          borderRadius: 40,
          overflow: "hidden",
          background: "#fff",
          border: `1px solid ${theme.line}`,
          boxShadow: "0 80px 140px -40px rgba(59,11,111,0.38), 0 36px 70px -24px rgba(109,40,217,0.28), 0 0 0 1px rgba(255,255,255,0.7) inset",
        }}
      >
        <div style={{ height: BAR, display: "flex", alignItems: "center", gap: 10, padding: "0 24px", background: theme.tint, borderBottom: `1px solid ${theme.line}` }}>
          {["#d9cdf2", "#d9cdf2", "#d9cdf2"].map((c, i) => (
            <span key={i} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
          ))}
        </div>
        <div style={{ width: innerWidth, height: innerHeight, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
      </div>
    </div>
  );
};
