import React from "react";
import { Img, staticFile } from "remotion";

/** Ported from frontend/src/components/MatchCard.tsx: same markup and classes, minus Next.js links. */
export type Match = {
  name: string;
  age: number;
  occupation: string;
  area: string;
  score: number;
  avatar: string;
  verified?: boolean;
  reasons: { icon: string; text: string }[];
  tags: string[];
  badge: { kind: "room" | "looking"; text: string };
  active: string;
};

export const ScoreRing: React.FC<{ score: number; size?: number; stroke?: number; progress?: number }> = ({ score, size = 54, stroke = 5, progress = 1 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const shown = Math.round(score * progress);
  const color = score >= 90 ? "#059669" : "#6d28d9";
  return (
    <span style={{ position: "relative", display: "inline-grid", placeItems: "center", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e6e0f3" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - (score / 100) * progress)} />
      </svg>
      <span style={{ position: "absolute", fontWeight: 800, fontSize: size * 0.3, color, letterSpacing: "-0.03em" }}>
        {shown}
        <span style={{ fontSize: size * 0.17 }}>%</span>
      </span>
    </span>
  );
};

export const MatchCard: React.FC<{ m: Match; progress?: number; width?: number }> = ({ m, progress = 1, width = 520 }) => (
  <div className="card relative flex flex-col overflow-hidden p-5" style={{ width }}>
    <div className="flex items-start gap-3.5">
      <Img src={staticFile(`avatars/${m.avatar}`)} style={{ width: 60, height: 60, borderRadius: 30, objectFit: "cover" }} />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-lg font-bold leading-tight">{m.name}</span>
          {m.verified && <span style={{ color: "#0ea5e9", fontSize: 16 }}>✓</span>}
        </div>
        <div className="mt-0.5 truncate text-sm text-muted">{m.age} · {m.occupation}</div>
        <div className="mt-1 text-xs text-muted">📍 {m.area}</div>
      </div>
      <ScoreRing score={m.score} size={54} progress={progress} />
    </div>
    <ul className="mt-4 grid gap-2">
      {m.reasons.map((r) => (
        <li key={r.text} className="flex items-center gap-2.5 text-sm text-ink/90">
          <span className="w-5 text-center">{r.icon}</span>
          <span className="truncate">{r.text}</span>
        </li>
      ))}
    </ul>
    <div className="mt-4 flex flex-wrap gap-1.5">
      {m.tags.map((t) => (
        <span key={t} className="chip" style={{ fontSize: 11, color: "#6b6485" }}>{t}</span>
      ))}
    </div>
    <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3.5">
      {m.badge.kind === "room" ? (
        <span className="rounded-lg bg-deep px-2 py-1 text-[11px] font-semibold text-white">🏠 {m.badge.text}</span>
      ) : (
        <span className="rounded-lg bg-brand/10 px-2 py-1 text-[11px] font-semibold text-brand">🔍 {m.badge.text}</span>
      )}
      <span className="text-[11px] text-muted">{m.active}</span>
    </div>
  </div>
);

export const SAMPLE: Match[] = [
  {
    name: "Ananya Rao", age: 26, occupation: "Product designer, SaaS", area: "Indiranagar", score: 95, avatar: "a3.jpg", verified: true,
    reasons: [{ icon: "🎸", text: "Both into indie & acoustic music" }, { icon: "🌙", text: "Both night owls" }],
    tags: ["☕ Café hopping", "🍜 Street food", "📷 Photography"], badge: { kind: "room", text: "Has a room · ₹18k/mo" }, active: "Active now",
  },
  {
    name: "Rohan Mehta", age: 27, occupation: "Software engineer, fintech", area: "Koramangala", score: 91, avatar: "a1.jpg", verified: true,
    reasons: [{ icon: "🥗", text: "Both vegetarian" }, { icon: "💸", text: "Budgets overlap at ₹15–20k" }],
    tags: ["🎮 Gaming", "🏏 Cricket", "🎬 Hollywood & Netflix"], badge: { kind: "looking", text: "Looking · ₹15k – ₹20k" }, active: "Active 2h ago",
  },
];
