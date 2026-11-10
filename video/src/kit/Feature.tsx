import React from "react";
import { AbsoluteFill } from "remotion";
import { AnimatedText } from "./AnimatedText";
import { SpringIn } from "./SpringIn";
import { Drift, ScaleThrough } from "./Scene";
import { springs, theme } from "../theme";

type Props = {
  headline: string;
  proof: React.ReactNode;
  /** scene length in frames */
  d: number;
  headlineSize?: number;
  /** push-in on the whole scene, e.g. {from: 1, to: 1.12, origin: "70% 40%"} */
  camera?: { from?: number; to?: number; origin?: string; panX?: number; panY?: number };
  /** extra zoom applied to the device only (cinematic push-in on a UI detail) */
  deviceZoom?: { scale: number; origin: string };
  children: React.ReactNode;
};

/** Headline + proof line on the left, floating device on the right. Used by all 3 feature scenes. */
export const FeatureLayout: React.FC<Props> = ({ headline, proof, d, headlineSize = 112, camera, deviceZoom, children }) => (
  <ScaleThrough duration={d}>
    <Drift duration={d} from={camera?.from ?? 1} to={camera?.to ?? 1.05} origin={camera?.origin} panX={camera?.panX ?? -20} panY={camera?.panY ?? 0}>
      <AbsoluteFill>
        <div style={{ position: "absolute", left: theme.margin, top: 0, bottom: 0, width: 860, display: "flex", flexDirection: "column", justifyContent: "center", gap: 32 }}>
          <AnimatedText text={headline} size={headlineSize} align="left" delay={12} stagger={5} lineHeight={1.02} />
          <SpringIn delay={46} y={24} blur={8}>
            <div style={{ fontFamily: theme.font, fontSize: 34, fontWeight: 300, color: theme.muted, letterSpacing: "-0.02em", lineHeight: 1.35 }}>{proof}</div>
          </SpringIn>
        </div>
        <div style={{ position: "absolute", right: 56, top: 0, bottom: 0, display: "flex", alignItems: "center", transformOrigin: deviceZoom?.origin }}>
          <SpringIn delay={8} x={120} y={30} scale={0.92} config={springs.soft} blur={10}>
            {children}
          </SpringIn>
        </div>
      </AbsoluteFill>
    </Drift>
  </ScaleThrough>
);
