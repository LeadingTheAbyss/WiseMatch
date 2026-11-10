import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedText } from "./kit/AnimatedText";
import { DeviceFrame } from "./kit/DeviceFrame";
import { FeatureLayout } from "./kit/Feature";
import { Drift, ScaleThrough } from "./kit/Scene";
import { SpringIn } from "./kit/SpringIn";
import { easeOutExpo, springs, theme } from "./theme";
import { Av, Bubble, RequestList, ThreadHeader, Typing } from "./ui/Chat";
import { MatchCard, SAMPLE } from "./ui/MatchCard";
import { PoolCounter, Q, QuestionCard } from "./ui/Onboarding";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const center: React.CSSProperties = { justifyContent: "center", alignItems: "center" };

/* ------------------------------------------------------------------ 1. Hook */
export const Hook: React.FC<{ d: number }> = ({ d }) => (
  <ScaleThrough duration={d} first>
    <Drift duration={d}>
      <AbsoluteFill style={center}>
        <AnimatedText text={"Roommates\nshouldn't be\n*a gamble.*"} size={176} delay={6} stagger={5} />
      </AbsoluteFill>
    </Drift>
  </ScaleThrough>
);

/* ------------------------------------------------------------------ 2. Problem */
const FIELDS = ["Full name", "Age", "Occupation", "Diet", "Smoking", "Drinking", "Sleep schedule", "Cleanliness", "Noise level", "Guests", "Pets", "Budget", "Location", "Move-in date", "Religion", "Languages", "Hobbies", "Bio"];

export const Problem: React.FC<{ d: number }> = ({ d }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scroll = interpolate(f, [0, 190], [160, -980], { easing: easeOutExpo });
  const textOut = interpolate(f, [150, 186], [1, 0], clamp);
  const dot = spring({ frame: f - 196, fps, config: springs.soft });
  return (
    <ScaleThrough duration={d}>
      <Drift duration={d}>
        <AbsoluteFill style={center}>
          {/* a long, tiring form scrolling away behind the headline */}
          <div style={{ position: "absolute", top: 0, width: 700, transform: `translateY(${scroll}px)`, opacity: 0.5, filter: "blur(2.5px)" }}>
            {FIELDS.map((l) => (
              <div key={l} style={{ marginBottom: 30 }}>
                <div style={{ fontFamily: theme.font, fontSize: 20, fontWeight: 500, color: theme.muted, marginBottom: 10 }}>{l}</div>
                <div style={{ height: 58, borderRadius: 14, border: `2px solid ${theme.line}`, background: "#fff" }} />
              </div>
            ))}
          </div>
          <div style={{ opacity: textOut, transform: `scale(${1 + (1 - textOut) * 0.08})` }}>
            <AnimatedText text={"50 fields.\n*Zero vibe.*"} size={176} delay={8} stagger={6} />
          </div>
          {/* the dot that becomes the logo in the next scene */}
          <div style={{ position: "absolute", width: 44, height: 44, borderRadius: 22, background: theme.gradient, transform: `scale(${dot})`, boxShadow: "0 0 60px rgba(139,92,246,0.55)" }} />
        </AbsoluteFill>
      </Drift>
    </ScaleThrough>
  );
};

/* ------------------------------------------------------------------ 3. Reveal */
export const Reveal: React.FC<{ d: number }> = ({ d }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grow = spring({ frame: f, fps, config: { damping: 22, stiffness: 120, mass: 1 } });
  const logo = interpolate(f, [26, 56], [0, 1], { ...clamp, easing: easeOutExpo });
  const rise = spring({ frame: f - 40, fps, config: springs.soft });
  return (
    <ScaleThrough duration={d} inFrames={12}>
      <Drift duration={d}>
        <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 36 }}>
          <div style={{ width: 360, height: 360, borderRadius: 180, overflow: "hidden", position: "relative", transform: `translateY(${(1 - rise) * 170}px) scale(${0.12 + 0.88 * grow})`, background: theme.gradient, boxShadow: "0 40px 90px -20px rgba(59,11,111,0.4)" }}>
            <Img src={staticFile("logo.png")} style={{ position: "absolute", inset: 0, width: 360, height: 360, opacity: logo }} />
          </div>
          <AnimatedText text={"Roommates that\n*match your vibe.*"} size={108} delay={50} stagger={5} lineHeight={1.02} />
          <SpringIn delay={96} y={20} blur={8}>
            <div style={{ fontFamily: theme.font, fontSize: 36, fontWeight: 300, color: theme.muted, letterSpacing: "-0.02em" }}>Smart questions. Compatible people.</div>
          </SpringIn>
        </AbsoluteFill>
      </Drift>
    </ScaleThrough>
  );
};

/* ------------------------------------------------------------------ 4. Feature: questions */
const OPTS = (a: [string, string][]) => a.map(([emoji, label]) => ({ emoji, label }));
const QUESTIONS: { q: Q; from: number; to: number; youTap: number; themTap: number }[] = [
  { q: { text: "How tidy is your space?", hint: "Which one is you?", themHint: "How tidy should your roommate be?", options: OPTS([["✨", "Spotless"], ["🧺", "Reasonably tidy"], ["🛋️", "Easygoing"]]), you: 1, them: null }, from: 30, to: 210, youTap: 70, themTap: 9999 },
  { q: { text: "Early bird or night owl?", hint: "Which one is you?", themHint: "Which sleep rhythm suits you?", options: OPTS([["🌅", "Early bird"], ["🌗", "Flexible"], ["🦉", "Night owl"]]), you: 2, them: 2 }, from: 210, to: 390, youTap: 56, themTap: 90 },
  { q: { text: "Do you enjoy café hopping?", emoji: "☕", hint: "Which one is you?", themHint: "Should your roommate be into it?", options: OPTS([["👍", "Yes, I'm into it"], ["🙅", "Not really"]]), themOptions: OPTS([["🤝", "Into it too"], ["🌿", "Not their thing"]]), you: 0, them: null, examples: ["Third Wave Coffee", "Blue Tokai", "Dyu Art Cafe"] }, from: 390, to: 564, youTap: 56, themTap: 9999 },
];

export const Questions: React.FC<{ d: number }> = ({ d }) => {
  const f = useCurrentFrame();
  const value = interpolate(f, [0, 210, 262, 390, 442, 480, 540], [462, 462, 311, 311, 142, 142, 29], { ...clamp, easing: easeOutExpo });
  const step = f < 210 ? 1 : f < 390 ? 2 : 3;
  return (
    <FeatureLayout headline={"Fewer questions.\n*Smarter ones.*"} headlineSize={96} d={d} camera={{ from: 1, to: 1.1, origin: "78% 30%", panX: -30 }} proof={<>462 people → your best match<br />in ~8 questions.</>}>
      <DeviceFrame width={880} innerWidth={760} innerHeight={700} tilt={{ y: -3, x: 1 }} float={8}>
        <div style={{ width: 760, height: 700, padding: 28, background: "linear-gradient(180deg,#faf8ff,#fff)", display: "flex", flexDirection: "column", gap: 20 }}>
          <PoolCounter value={value} total={462} step={step} ruledOut={462 - value} />
          <div style={{ position: "relative", flex: 1 }}>
            {QUESTIONS.map((x, i) => (
              <Sequence key={i} from={x.from} durationInFrames={x.to - x.from + (i === 2 ? 40 : 0)} layout="none">
                <div style={{ position: "absolute", inset: 0 }}>
                  <QuestionCard q={x.q} youTap={x.youTap} themTap={x.themTap} />
                </div>
              </Sequence>
            ))}
          </div>
        </div>
      </DeviceFrame>
    </FeatureLayout>
  );
};

/* ------------------------------------------------------------------ 5. Feature: matches */
export const Matches: React.FC<{ d: number }> = ({ d }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ring = interpolate(f, [34, 110], [0, 1], { ...clamp, easing: easeOutExpo });
  // cinematic push-in on the 95% ring: the ring travels to the middle of the frame while we scale
  const S = 1.5;
  const p = spring({ frame: f - 290, fps, config: springs.soft });
  const s = 1 + (S - 1) * p;
  const tx = p * (380 - 316 * S);
  const ty = p * (250 - 110 * S);
  return (
    <FeatureLayout headline={"Matched on\n*taste.*"} headlineSize={128} d={d} proof={<>650+ people. 28 neighbourhoods.<br />One best match.</>}>
      <DeviceFrame width={920} innerWidth={760} innerHeight={640} tilt={{ y: -4, x: 1 }} float={8}>
        <div style={{ position: "relative", width: 760, height: 640, background: "linear-gradient(180deg,#faf8ff,#fff)", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
            <SpringIn delay={28} y={80} config={springs.snappy} style={{ position: "absolute", left: 36, top: 36 }}>
              <MatchCard m={SAMPLE[0]} progress={ring} width={560} />
            </SpringIn>
            <SpringIn delay={38} y={120} config={springs.snappy} style={{ position: "absolute", left: 164, top: 318 }}>
              <MatchCard m={SAMPLE[1]} progress={ring} width={560} />
            </SpringIn>
          </div>
        </div>
      </DeviceFrame>
    </FeatureLayout>
  );
};

/* ------------------------------------------------------------------ 6. Feature: chat */
export const Chat: React.FC<{ d: number }> = ({ d }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = spring({ frame: f - 150, fps, config: springs.soft });
  const open = f >= 150;
  const press = spring({ frame: f - 250, fps, config: springs.snappy });
  const accepted = f >= 252;
  const banner = interpolate(f, [262, 292], [1, 0], { ...clamp, easing: easeOutExpo });
  const pulse = open ? 0 : Math.abs(Math.sin(f / 14));
  const paneIn = interpolate(f, [150, 176], [0, 1], { ...clamp, easing: easeOutExpo });
  return (
    <FeatureLayout headline={"Chat first.\n*Move in later.*"} headlineSize={92} d={d} proof={<>Get to know each other<br />before the lease.</>}>
      <div style={{ transformOrigin: "80% 55%", transform: `scale(${1 + 0.22 * zoom})` }}>
        <DeviceFrame width={940} innerWidth={1040} innerHeight={640} tilt={{ y: -3, x: 1 }} float={7}>
          <div style={{ display: "flex", width: 1040, height: 640, background: "#fff" }}>
            <RequestList selected={open} pulse={pulse} />
            <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#faf8ff,#fff)" }}>
              {!open && (
                <div style={{ margin: "auto", textAlign: "center", color: theme.muted, fontFamily: theme.font }}>
                  <div style={{ fontSize: 52 }}>💬</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: theme.ink }}>Pick a conversation</div>
                </div>
              )}
              {open && (
                <div style={{ opacity: paneIn, display: "flex", flexDirection: "column", height: "100%" }}>
                  <ThreadHeader />
                  {banner > 0.01 && (
                    <div style={{ height: 96 * banner, opacity: banner, overflow: "hidden", background: "rgba(109,40,217,0.06)", borderBottom: `1px solid ${theme.line}` }}>
                      <div style={{ padding: "14px 20px" }}>
                        <div style={{ fontSize: 14 }}><b>Rohan</b> wants to message you. They won&apos;t see that you&apos;ve read this until you accept.</div>
                        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                          <div className="btn-primary" style={{ padding: "7px 22px", transform: `scale(${accepted ? 1 - (1 - press) * 0.08 : 1})` }}>Accept</div>
                          <div style={{ padding: "7px 18px", borderRadius: 12, border: `1px solid ${theme.line}`, fontSize: 14, fontWeight: 600, background: "#fff" }}>Delete</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, justifyContent: "flex-end" }}>
                    <Bubble delay={170}>Hi Aarav! We came up as a 91% match. Are you still looking around Koramangala?</Bubble>
                    <Bubble mine delay={300} time="10:21 pm">Hey Rohan! Yes, moving in December. Do you cook?</Bubble>
                    <Typing from={350} to={398} />
                    <Bubble delay={400} time="10:22 pm">Every Sunday 😄 Veg only, I hope that&apos;s okay?</Bubble>
                    <Bubble mine delay={470} time="10:22 pm">Perfect, same here!</Bubble>
                  </div>
                  <div className="flex items-center gap-2 border-t border-line p-3.5">
                    <div className="flex-1 rounded-full border border-line px-4 py-3 text-sm text-muted">Type a message</div>
                    <div className="btn-primary" style={{ width: 44, height: 44, borderRadius: 22, padding: 0 }}>➤</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DeviceFrame>
      </div>
    </FeatureLayout>
  );
};

/* ------------------------------------------------------------------ 7. Finale */
const ORBIT = [
  { src: "a3.jpg", x: -700, y: -300, size: 120, ph: 0 },
  { src: "a1.jpg", x: 660, y: -260, size: 104, ph: 1.4 },
  { src: "a4.jpg", x: -620, y: 270, size: 96, ph: 2.6 },
  { src: "a2.jpg", x: 700, y: 300, size: 128, ph: 3.8 },
];

export const Finale: React.FC<{ d: number }> = ({ d }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  return (
    <ScaleThrough duration={d} last inFrames={30}>
      <Drift duration={d} from={1.07} to={1}>
        <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 28 }}>
          {ORBIT.map((o, i) => (
            <div key={o.src} style={{ position: "absolute", left: 960 + o.x - o.size / 2, top: 540 + o.y - o.size / 2 }}>
              <SpringIn delay={30 + i * 6} x={-o.x * 0.45} y={-o.y * 0.45} blur={10} scale={0.6}>
                <div style={{ transform: `translateY(${Math.sin(t * 1.2 + o.ph) * 12}px)`, filter: "drop-shadow(0 24px 40px rgba(59,11,111,0.28))" }}>
                  <Av src={o.src} size={o.size} />
                </div>
              </SpringIn>
            </div>
          ))}
          <SpringIn delay={4} y={60} scale={0.8} config={springs.soft}>
            <div style={{ width: 220, height: 220, borderRadius: 110, overflow: "hidden", boxShadow: "0 40px 90px -24px rgba(59,11,111,0.45)" }}>
              <Img src={staticFile("logo.png")} style={{ width: 220, height: 220 }} />
            </div>
          </SpringIn>
          <AnimatedText text={"Find your\n*people.*"} size={156} delay={26} stagger={6} lineHeight={1.0} />
          <SpringIn delay={80} y={30} scale={0.9} config={springs.snappy}>
            <div style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 14, padding: "22px 52px", borderRadius: 999, backgroundImage: theme.gradient, color: "#fff", fontFamily: theme.font, fontSize: 38, fontWeight: 700, letterSpacing: "-0.02em", boxShadow: "0 30px 60px -18px rgba(109,40,217,0.6)" }}>
              Try Today at <span style={{ fontWeight: 300 }}>getwisematch.vercel.app</span>
            </div>
          </SpringIn>
        </AbsoluteFill>
      </Drift>
    </ScaleThrough>
  );
};
