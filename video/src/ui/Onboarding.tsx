import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { easeOutExpo, springs } from "../theme";

/** Ported from frontend/src/app/onboarding/page.tsx: the You / Them question card and the pool counter. */
export type Opt = { emoji: string; label: string };
export type Q = { text: string; emoji?: string; hint: string; options: Opt[]; themHint: string; you: number; them: number | null; examples?: string[]; themOptions?: Opt[] };

export const PoolCounter: React.FC<{ value: number; total: number; step: number; ruledOut: number }> = ({ value, total, step, ruledOut }) => (
  <div className="card p-5">
    <div className="text-xs font-semibold uppercase tracking-wide text-muted">People still in the running</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 4 }}>
      <span style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, backgroundImage: "linear-gradient(135deg,#5b21b6,#a855f7)", WebkitBackgroundClip: "text", color: "transparent" }}>{Math.round(value)}</span>
      <span className="text-base font-medium text-muted">of {total}</span>
    </div>
    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-line">
      <div style={{ width: `${Math.max(3, (value / total) * 100)}%`, height: "100%", borderRadius: 999, backgroundImage: "linear-gradient(90deg,#6d28d9,#a78bfa)" }} />
    </div>
    <div className="mt-3 flex items-center justify-between text-xs text-muted">
      <span>Question {step} of up to 12</span>
      <span>{Math.round(ruledOut)} ruled out so far</span>
    </div>
  </div>
);

const Column: React.FC<{ title: string; hint: string; options: Opt[]; selected: number | null; tapAt: number; any?: boolean }> = ({ title, hint, options, selected, tapAt, any }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const press = spring({ frame: f - tapAt, fps, config: springs.snappy });
  const on = (i: number) => selected === i && f >= tapAt;
  return (
    <div className="flex min-w-0 flex-col p-4">
      <div className="mb-1 text-center text-sm font-bold uppercase tracking-wider text-brand">{title}</div>
      <div className="mb-3 min-h-8 text-center text-[11px] leading-tight text-muted">{hint}</div>
      <div className="grid gap-2">
        {options.map((o, i) => (
          <div key={o.label} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-semibold ${on(i) ? "border-brand bg-brand text-white shadow-md shadow-brand/25" : "border-line bg-white text-ink/85"}`} style={{ transform: on(i) ? `scale(${1 + (1 - press) * -0.05 + 0.0})` : undefined }}>
            <span className="text-lg leading-none">{o.emoji}</span>
            <span>{o.label}</span>
          </div>
        ))}
        {any !== undefined && (
          <div className={`rounded-xl border border-dashed px-3 py-2 text-xs font-semibold ${selected === null ? "border-brand bg-brand/10 text-brand" : "border-line text-muted"}`}>😌 Doesn&apos;t matter</div>
        )}
      </div>
    </div>
  );
};

export const QuestionCard: React.FC<{ q: Q; youTap: number; themTap: number }> = ({ q, youTap, themTap }) => {
  const f = useCurrentFrame();
  const enter = interpolate(f, [0, 22], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  return (
    <div className="card overflow-hidden" style={{ opacity: enter, transform: `translateY(${(1 - enter) * 30}px)` }}>
      <div className="border-b border-line p-5">
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
          {q.emoji && <span className="mr-2">{q.emoji}</span>}
          {q.text}
        </div>
        {q.examples && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">e.g.</span>
            {q.examples.map((x) => (
              <span key={x} className="chip">{x}</span>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 divide-x divide-line">
        <Column title="You" hint={q.hint} options={q.options} selected={q.you} tapAt={youTap} />
        <Column title="Them" hint={q.themHint} options={q.themOptions ?? q.options} selected={q.them} tapAt={themTap} any />
      </div>
    </div>
  );
};
