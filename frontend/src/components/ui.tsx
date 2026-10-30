"use client";

import { useEffect, useRef, useState } from "react";
import { initials, scoreColor } from "@/lib/format";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-display text-lg font-bold tracking-tight text-ink">
      <span style={{ fontSize: size, lineHeight: 1 }} aria-hidden>🏠</span>
      WiseMatch
    </span>
  );
}

export function Avatar({ name, id, size = 44, ring, src }: { name: string; id: number; size?: number; ring?: boolean; src?: string }) {
  const [bad, setBad] = useState(false);
  const hue = (id * 47) % 360;
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full ${ring ? "ring-2 ring-brand/70 ring-offset-2 ring-offset-white" : ""}`}
      style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${hue} 55% 60%), hsl(${(hue + 50) % 360} 55% 45%))` }}
    >
      {bad || !src ? (
        <span className="font-display font-semibold text-white" style={{ fontSize: size * 0.38 }}>
          {initials(name)}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} width={size} height={size} loading="lazy" onError={() => setBad(true)} className="h-full w-full object-cover" />
      )}
    </span>
  );
}

export function ScoreRing({ score, size = 56, stroke = 5, label = true }: { score: number; size?: number; stroke?: number; label?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e6e0f3" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      {label && (
        <span className="absolute font-display font-bold leading-none" style={{ fontSize: size * 0.3, color }}>
          {score}
          <span style={{ fontSize: size * 0.17 }}>%</span>
        </span>
      )}
    </span>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const map: Record<string, string> = {
    qloo: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    mock: "bg-amber-500/10 text-amber-700 border-amber-500/25",
    groq: "bg-sky-500/15 text-sky-700 border-sky-500/30",
    agent: "bg-violet-500/15 text-brand border-violet-500/30",
    engine: "bg-zinc-500/15 text-zinc-600 border-zinc-500/30",
  };
  const label: Record<string, string> = { qloo: "Qloo live", mock: "Taste graph", groq: "Groq", agent: "Agent", engine: "Engine" };
  return <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[source] ?? map.engine}`}>{label[source] ?? source}</span>;
}

export function useCountUp(target: number, ms = 700): number {
  const [val, setVal] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(start + (target - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body?: string }) {
  return (
    <div className="grid place-items-center gap-2 px-6 py-14 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="font-display text-lg font-semibold">{title}</div>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
    </div>
  );
}
