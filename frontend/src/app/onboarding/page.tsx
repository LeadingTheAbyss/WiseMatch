"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, RotateCcw, Sparkles, Undo2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AgentStep, Option, Question, TraceEvent } from "@/lib/types";
import { Avatar, Logo, SourceBadge, Spinner, useCountUp } from "@/components/ui";
import { AgentFeed } from "@/components/AgentFeed";

function Column({ title, hint, options, selected, multi, onPick, anyOn, onAny }: {
  title: string; hint?: string; options: Option[]; selected: string[]; multi?: boolean;
  onPick: (v: string) => void; anyOn?: boolean; onAny?: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col p-2.5 sm:p-4">
      <div className="mb-1 text-center font-display text-sm font-bold uppercase tracking-wider text-violet-200">{title}</div>
      <div className="mb-3 min-h-8 text-center text-[11px] leading-tight text-muted">{hint}</div>
      <div className="grid gap-2">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button key={o.value} type="button" onClick={() => onPick(o.value)} aria-pressed={on}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left text-[13px] font-medium leading-tight transition sm:px-3 sm:text-sm ${on ? "border-brand bg-brand/20 text-white shadow-md shadow-brand/10" : "border-line bg-surface2 text-ink/85 hover:border-brand/50"}`}>
              <span className="text-lg leading-none">{o.emoji}</span>
              <span className="min-w-0">{o.label}</span>
              {multi && <span className={`ml-auto grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${on ? "border-brand bg-brand text-white" : "border-line"}`}>{on ? "✓" : ""}</span>}
            </button>
          );
        })}
        {onAny && (
          <button type="button" onClick={onAny} aria-pressed={anyOn}
            className={`rounded-xl border border-dashed px-3 py-2 text-xs font-medium transition ${anyOn ? "border-brand/70 bg-brand/10 text-white" : "border-line text-muted hover:border-brand/40"}`}>
            😌 Doesn&apos;t matter
          </button>
        )}
      </div>
    </div>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const { me, loading: authLoading, refresh } = useAuth();
  const [step, setStep] = useState<AgentStep | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [you, setYou] = useState<string | null>(null);
  const [them, setThem] = useState<string[]>([]);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [asked, setAsked] = useState(0);
  const started = useRef(false);

  const absorb = useCallback((s: AgentStep) => {
    setStep(s);
    setYou(null);
    setThem([]);
    setEvents((prev) => {
      const seen = new Set(prev.map((e) => e.id));
      return [...prev, ...s.trace.filter((e) => !seen.has(e.id))];
    });
  }, []);

  const call = useCallback(async (path: string, body?: unknown) => {
    setBusy(true);
    setError("");
    try {
      absorb(await api<AgentStep>(path, { method: "POST", body: body ?? {} }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The agent hit a snag");
    } finally {
      setBusy(false);
    }
  }, [absorb]);

  useEffect(() => {
    if (authLoading) return;
    if (!me) return void router.replace("/");
    if (!me.onboarded) return void router.replace("/start");
    if (!started.current) {
      started.current = true;
      void call("/agent/next");
    }
  }, [authLoading, me, router, call]);

  const q: Question | null = step?.question ?? null;
  const initial = step?.pool.initial ?? 0;
  const remaining = useCountUp(step?.pool.remaining ?? 0, 800);
  const pct = initial ? Math.max(3, Math.round(((step?.pool.remaining ?? 0) / initial) * 100)) : 100;

  function pickYou(v: string) {
    setYou(v);
  }
  function pickThem(v: string) {
    if (!q) return;
    if (q.kind === "taste") return setThem((t) => (t.includes(v) ? [] : [v]));
    setThem((t) => (t.includes(v) ? t.filter((x) => x !== v) : [...t, v]));
  }
  function sameAsMe() {
    if (you) setThem([you]);
  }
  async function submit() {
    if (!q || !you) return;
    const normal = them.length >= q.them_options.length ? [] : them;
    setAsked((n) => n + 1);
    await call("/agent/answer", { question_id: q.id, you, them: normal });
  }
  async function finish() {
    await refresh();
    router.push("/discover");
  }

  const hardWarn = q?.hard && them.length > 0;

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-3 pb-28 pt-4 sm:px-6">
      <header className="mb-4 flex items-center justify-between">
        <Logo />
        <button className="text-xs font-medium text-muted underline-offset-4 hover:text-ink hover:underline" onClick={finish}>
          Skip to matches
        </button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="card p-4 sm:p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted">People still in the running</div>
                <div className="font-display text-4xl font-extrabold leading-none sm:text-5xl">
                  <span className="grad-text">{remaining}</span>
                  <span className="ml-2 text-base font-medium text-muted">of {initial || "…"}</span>
                </div>
              </div>
              {step && step.top.length > 0 && (
                <div className="hidden items-center gap-2 sm:flex">
                  <div className="text-right text-[11px] leading-tight text-muted">Closing in on<br /><span className="font-semibold text-ink">{step.top[0].name.split(" ")[0]} · {step.top[0].score}%</span></div>
                  <div className="flex -space-x-2">
                    {step.top.map((t) => <Avatar key={t.id} name={t.name} id={t.id} size={36} ring />)}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundImage: "linear-gradient(90deg,#8b5cf6,#ec4899)" }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted">
              <span>Question {Math.min((step?.answered ?? 0) + 1, step?.max_questions ?? 12)} of up to {step?.max_questions ?? 12}</span>
              <span>{step ? `${step.pool.removed} ruled out so far` : ""}</span>
            </div>
          </div>

          {error && (
            <div className="card mt-4 border-rose-500/40 p-4 text-sm text-rose-300">
              {error}
              <button className="btn-ghost ml-3 !py-1.5" onClick={() => call("/agent/next")}>Retry</button>
            </div>
          )}

          {step?.done ? (
            <div className="card anim-in mt-4 grid place-items-center gap-3 p-8 text-center">
              <div className="text-5xl">🎯</div>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Found your people.</h2>
              <p className="max-w-md text-sm text-muted">
                The agent narrowed {step.pool.initial} people down to <b className="text-ink">{step.pool.remaining}</b> after {step.answered} questions. They&apos;re ranked by compatibility, best first.
              </p>
              <div className="flex -space-x-2">{step.top.map((t) => <Avatar key={t.id} name={t.name} id={t.id} size={48} ring />)}</div>
              <button className="btn-primary mt-2 px-8" onClick={finish}>See my matches <ArrowRight size={16} /></button>
            </div>
          ) : q ? (
            <div key={q.id} className={`card anim-in mt-4 overflow-hidden ${busy ? "opacity-70" : ""}`}>
              <div className="border-b border-line p-4 sm:p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="chip border-brand/40 bg-brand/10 text-violet-200"><Sparkles size={12} /> {q.kind === "taste" ? "Taste question" : "Lifestyle"}</span>
                  {q.hard && <span className="chip border-amber-500/40 bg-amber-500/10 text-amber-200"><Lock size={11} /> Deal-breaker</span>}
                  <SourceBadge source={q.by_agent ? "agent" : "engine"} />
                </div>
                <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
                  {q.kind === "taste" && <span className="mr-2">{q.emoji}</span>}
                  {q.text}
                </h1>
                <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">🧠 {q.why}</p>
                {q.kind === "taste" && q.examples.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] uppercase tracking-wide text-muted">e.g.</span>
                    {q.examples.map((x) => (
                      <span key={x.id} className="chip !py-0.5">{x.name}</span>
                    ))}
                    <SourceBadge source={q.examples[0]?.source} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 divide-x divide-line">
                <Column title="You" hint="Which one is you?" options={q.options} selected={you ? [you] : []} onPick={pickYou} />
                <Column title="Them" hint={q.them_text} options={q.them_options} selected={them} multi={q.kind === "trait"} onPick={pickThem} anyOn={them.length === 0} onAny={() => setThem([])} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface2/50 px-4 py-3 text-xs text-muted">
                <span>
                  {hardWarn ? "🔒 Anyone who doesn't fit is removed immediately." : q.hard ? "Pick \"Them\" only if it's a must." : "This only nudges the match score, nobody gets removed."}
                </span>
                {you && <button className="font-medium text-violet-300 hover:underline" onClick={sameAsMe}>Same as me</button>}
              </div>
            </div>
          ) : (
            <div className="card mt-4 space-y-3 p-5">
              <div className="skeleton h-6 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-12" />)}
              </div>
            </div>
          )}
        </div>

        <aside className="order-last min-w-0">
          <div className="card p-4 lg:sticky lg:top-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-display font-semibold">Agent activity</div>
              <span className="text-[11px] text-muted">live</span>
            </div>
            <AgentFeed events={events} pending={busy} max={7} />
          </div>
        </aside>
      </div>

      {!step?.done && q && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:px-6">
            <button className="btn-ghost !px-3" disabled={busy || (step?.answered ?? 0) === 0} onClick={() => call("/agent/undo")} aria-label="Undo last answer">
              <Undo2 size={16} /> <span className="hidden sm:inline">Undo</span>
            </button>
            {(step?.answered ?? 0) >= 3 && (
              <button className="btn-ghost !px-3" onClick={finish}>See matches now</button>
            )}
            <button className="btn-primary ml-auto min-w-36 flex-1 sm:flex-none" disabled={busy || !you} onClick={submit}>
              {busy ? <Spinner /> : <>Next <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      )}
      {step?.done && asked > 0 && (
        <div className="mt-4 text-center">
          <button className="text-xs text-muted hover:text-ink" onClick={() => call("/agent/undo")}><RotateCcw size={12} className="mr-1 inline" /> Undo last answer</button>
        </div>
      )}
    </main>
  );
}
