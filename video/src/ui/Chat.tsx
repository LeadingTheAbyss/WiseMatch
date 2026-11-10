import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { easeOutExpo, springs } from "../theme";

/** Ported from frontend/src/app/(app)/chat: the Chats / Requests inbox, request banner and bubbles. */
export const Av: React.FC<{ src: string; size: number }> = ({ src, size }) => (
  <Img src={staticFile(`avatars/${src}`)} style={{ width: size, height: size, borderRadius: size / 2, objectFit: "cover" }} />
);

type Row = { name: string; av: string; text: string; time: string; score: number; area: string };
export const ROWS: Row[] = [
  { name: "Rohan Mehta", av: "a1.jpg", text: "Hi Aarav! We came up as a 91% match. Are you still looking around Koramangala?", time: "1h", score: 91, area: "Koramangala" },
  { name: "Karthik Nair", av: "a2.jpg", text: "Hey Aarav, saw you're into good food. Would love to chat about sharing a place!", time: "6h", score: 88, area: "Indiranagar" },
  { name: "Meera Iyer", av: "a4.jpg", text: "Hello! Your profile looks like a great fit for our flat.", time: "11h", score: 87, area: "HSR Layout" },
];

export const RequestList: React.FC<{ selected: boolean; pulse: number }> = ({ selected, pulse }) => (
  <div className="flex h-full flex-col border-r border-line bg-white" style={{ width: 380 }}>
    <div className="border-b border-line p-5 pb-0">
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em" }}>Messages</div>
      <div className="mt-3 rounded-xl border border-line px-3.5 py-2.5 text-sm text-muted">Search</div>
      <div className="mt-3 grid grid-cols-2">
        <div className="py-2.5 text-center text-sm font-semibold text-muted">Chats</div>
        <div className="flex items-center justify-center gap-2 border-b-2 border-brand py-2.5 text-sm font-semibold text-brand">
          Requests
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white" style={{ transform: `scale(${1 + pulse * 0.25})` }}>3</span>
        </div>
      </div>
    </div>
    <div>
      {ROWS.map((r, i) => {
        const hot = i === 0 && selected;
        return (
          <div key={r.name} className="flex items-center gap-3 border-b border-line/60 border-l-4 border-l-brand bg-brand/5 px-4 py-3.5" style={hot ? { background: "#ece4fb" } : undefined}>
            <Av src={r.av} size={50} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="truncate text-sm font-semibold">{r.name} <span style={{ color: "#0ea5e9" }}>✓</span></span>
                <span className="text-[11px] font-semibold text-brand">{r.time}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-medium">{r.text}</span>
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">1</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                <span>{r.score}% match · {r.area}</span>
                <span className="rounded bg-brand px-1.5 py-0.5 font-semibold text-white">New request</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export const Bubble: React.FC<{ mine?: boolean; delay: number; children: React.ReactNode; time?: string }> = ({ mine, delay, children, time = "10:19 pm" }) => {
  const f = useCurrentFrame() - delay;
  const { fps } = useVideoConfig();
  const p = spring({ frame: f, fps, config: springs.snappy });
  const o = interpolate(f, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutExpo });
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", opacity: o, transform: `translateY(${(1 - p) * 26}px) scale(${0.92 + 0.08 * p})`, transformOrigin: mine ? "right bottom" : "left bottom" }}>
      <div className={`rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${mine ? "rounded-br-md text-white" : "rounded-bl-md border border-line bg-white"}`} style={{ maxWidth: 440, ...(mine ? { backgroundImage: "linear-gradient(135deg,#6d28d9,#8b5cf6)" } : null) }}>
        {children}
        <div className={`mt-0.5 text-right text-[10px] ${mine ? "text-white/75" : "text-muted"}`}>{time}{mine ? " ✓✓" : ""}</div>
      </div>
    </div>
  );
};

export const Typing: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  return (
    <div style={{ display: "flex" }}>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-white px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 7, height: 7, borderRadius: 4, background: "#6b6485", opacity: 0.4 + 0.6 * Math.abs(Math.sin((f + i * 6) / 9)) }} />
        ))}
      </div>
    </div>
  );
};

export const ThreadHeader: React.FC = () => (
  <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
    <Av src="a1.jpg" size={44} />
    <div>
      <div className="text-sm font-semibold">Rohan Mehta <span style={{ color: "#0ea5e9" }}>✓</span></div>
      <div className="text-xs text-good">Active now</div>
    </div>
    <span className="chip ml-auto">91% match</span>
  </div>
);
