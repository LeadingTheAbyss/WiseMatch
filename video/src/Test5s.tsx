import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { AnimatedText } from "./kit/AnimatedText";
import { DeviceFrame } from "./kit/DeviceFrame";
import { SpringIn } from "./kit/SpringIn";
import { Background, Drift, ScaleThrough } from "./kit/Scene";
import { easeOutExpo, springs, theme } from "./theme";
import { MatchCard, SAMPLE } from "./ui/MatchCard";

const A = 170; // hook, 2.8s
const B_FROM = 140; // overlaps the hook so the scale-through feels like one move
const B = 160;

const Hook: React.FC = () => (
  <ScaleThrough duration={A} first>
    <Drift duration={A} from={1} to={1.05}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <AnimatedText text={"Roommates\nshouldn't be\n*a gamble.*"} size={176} delay={6} stagger={5} />
      </AbsoluteFill>
    </Drift>
  </ScaleThrough>
);

const Product: React.FC = () => {
  const f = useCurrentFrame();
  const ring = interpolate(f, [34, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutExpo });
  return (
    <ScaleThrough duration={B} last inFrames={30}>
      <Drift duration={B} from={1} to={1.05} panX={-24}>
        <AbsoluteFill>
          <div style={{ position: "absolute", left: theme.margin, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 32, width: 760 }}>
            <AnimatedText text={"Matched on\n*taste.*"} size={132} align="left" delay={14} stagger={5} lineHeight={1.02} />
            <SpringIn delay={44} y={24} blur={8}>
              <div style={{ fontFamily: theme.font, fontSize: 36, fontWeight: 300, color: theme.muted, letterSpacing: "-0.02em", lineHeight: 1.35 }}>
                650+ people. 28 neighbourhoods.
                <br />
                One best match.
              </div>
            </SpringIn>
          </div>

          {/* parallax: the frame and the cards drift at different speeds */}
          <div style={{ position: "absolute", right: theme.margin - 40, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
            <SpringIn delay={10} x={120} y={30} scale={0.92} config={springs.soft} blur={10}>
              <DeviceFrame width={920} innerWidth={760} innerHeight={640} tilt={{ y: -4, x: 1 }} float={8}>
                <div style={{ position: "relative", width: 760, height: 640, background: "linear-gradient(180deg,#faf8ff,#fff)" }}>
                  <SpringIn delay={28} y={80} config={springs.snappy} style={{ position: "absolute", left: 36, top: 36 }}>
                    <MatchCard m={SAMPLE[0]} progress={ring} width={560} />
                  </SpringIn>
                  <SpringIn delay={38} y={120} config={springs.snappy} style={{ position: "absolute", left: 164, top: 318 }}>
                    <MatchCard m={SAMPLE[1]} progress={ring} width={560} />
                  </SpringIn>
                </div>
              </DeviceFrame>
            </SpringIn>
          </div>

          <div style={{ position: "absolute", left: theme.margin, bottom: theme.margin - 24 }}>
            <SpringIn delay={70} y={20} blur={6}>
              <div style={{ width: 132, height: 132, borderRadius: "50%", overflow: "hidden", boxShadow: "0 18px 40px -12px rgba(59,11,111,0.35)" }}>
                <Img src={staticFile("logo.png")} style={{ width: 132, height: 132 }} />
              </div>
            </SpringIn>
          </div>
        </AbsoluteFill>
      </Drift>
    </ScaleThrough>
  );
};

export const Test5s: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <Sequence from={0} durationInFrames={A}>
      <Hook />
    </Sequence>
    <Sequence from={B_FROM} durationInFrames={B}>
      <Product />
    </Sequence>
  </AbsoluteFill>
);
