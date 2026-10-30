"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, RotateCcw, Undo2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AgentStep, Option, Question, TraceEvent } from "@/lib/types";
import { Avatar, Logo, Spinner, useCountUp } from "@/components/ui";
import { AgentFeed } from "@/components/AgentFeed";

function Column({ title, hint, options, selected, onPick, anyOn, onAny }: {
  title: string; hint?: string; options: Option[]; selected: string | null;
  onPick: (v: string) => void; anyOn?: boolean; onAny?: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col p-2.5 sm:p-4">
      <div className="mb-1 text-center font-display text-sm font-bold uppercase tracking-wider text-brand">{title}</div>
      <div className="mb-3 min-h-8 text-center text-[11px] leading-tight text-muted">{hint}</div>
      <div className="grid gap-2">
        {options.map((o) => {
          const on = selected === o.value;
          return (
            <button key={o.value} type="button" onClick={() => onPick(o.value)} aria-pressed={on}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left text-[13px] font-semibold leading-tight transition sm:px-3 sm:text-sm ${on ? "border-brand bg-brand text-white shadow-md shadow-brand/25" : "border-line bg-white text-ink/85 hover:border-brand/50 hover:bg-surface2"}`}>
              <span className="text-lg leading-none">{o.emoji}</span>
              <span className="min-w-0">{o.label}</span>
            </button>
          );
        })}
        {onAny && (
          <button type="button" onClick={onAny} aria-pressed={anyOn}
            className={`rounded-xl border border-dashed px-3 py-2 text-xs font-semibold transition ${anyOn ? "border-brand bg-brand/10 text-brand" : "border-line text-muted hover:border-brand/40"}`}>
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
  const [them, setThem] = useState<string | null>(null);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [feedOpen, setFeedOpen] = useState(true);
  const started = useRef(false);

  const absorb = useCallback((s: AgentStep) => {
    setStep(s);
    setYou(null);
    setThem(null);
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
      setError(e instanceof Error ? e.message : "Something went wrong");
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

  async function submit() {
    if (!q || !you) return;
    await call("/agent/answer", { question_id: q.id, you, them: them ? [them] : [] });
  }
  async function finish() {
    await refresh();
    router.push("/discover");
  }

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-3 pb-28 pt-4 sm:px-6">
      <header className="mb-4 flex items-center justify-between">
        <Logo />
        <button className="text-xs font-semibold text-muted underline-offset-4 hover:text-brand hover:underline" onClick={finish}>
          Skip to matches
        </button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="card p-4 sm:p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">People still in the running</div>
                <div className="font-display text-4xl font-extrabold leading-none sm:text-5xl">
                  <span className="grad-text">{remaining}</span>
                  <span className="ml-2 text-base font-medium text-muted">of {initial || "…"}</span>
                </div>
              </div>
              {step && step.top.length > 0 && (
                <div className="hidden items-center gap-2 sm:flex">
                  <div className="text-right text-[11px] leading-tight text-muted">Closing in on<br /><span className="font-semibold text-ink">{step.top[0].name.split(" ")[0]} · {step.top[0].score}%</span></div>
                  <div className="flex -space-x-2">
                    {step.top.map((t) => <Avatar key={t.id} name={t.name} id={t.id} size={36} ring src={t.avatar} />)}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundImage: "linear-gradient(90deg,#6d28d9,#a78bfa)" }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted">
              <span>Question {Math.min((step?.answered ?? 0) + 1, step?.max_questions ?? 12)} of up to {step?.max_questions ?? 12}</span>
              <span>{step ? `${step.pool.removed} ruled out so far` : ""}</span>
            </div>
          </div>

          {error && (
            <div className="card mt-4 border-rose-300 p-4 text-sm text-rose-600">
              {error}
              <button className="btn-ghost ml-3 !py-1.5" onClick={() => call("/agent/next")}>Retry</button>
            </div>
          )}

          {step?.done ? (
            <div className="card anim-in mt-4 grid place-items-center gap-3 p-8 text-center">
              <div className="text-5xl">🎯</div>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Found your people.</h2>
              <p className="max-w-md text-sm text-muted">
                We narrowed {step.pool.initial} people down to <b className="text-ink">{step.pool.remaining}</b> after {step.answered} questions. They&apos;re ranked by compatibility, best first.
              </p>
              <div className="flex -space-x-2">{step.top.map((t) => <Avatar key={t.id} name={t.name} id={t.id} size={48} ring src={t.avatar} />)}</div>
              <button className="btn-primary mt-2 px-8" onClick={finish}>See my matches <ArrowRight size={16} /></button>
              <button className="text-xs text-muted hover:text-ink" onClick={() => call("/agent/undo")}><RotateCcw size={12} className="mr-1 inline" /> Undo last answer</button>
            </div>
          ) : q ? (
            <div key={q.id} className={`card anim-in mt-4 overflow-hidden ${busy ? "opacity-70" : ""}`}>
              <div className="border-b border-line p-4 sm:p-5">
                <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
                  {q.kind === "taste" && <span className="mr-2">{q.emoji}</span>}
                  {q.text}
                </h1>
                {q.kind === "taste" && q.examples.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">e.g.</span>
                    {q.examples.map((x) => (
                      <span key={x.id} className="chip !py-0.5">{x.name}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 divide-x divide-line">
                <Column title="You" hint="Which one is you?" options={q.options} selected={you} onPick={setYou} />
                <Column title="Them" hint={q.them_text} options={q.them_options} selected={them} onPick={setThem} anyOn={them === null} onAny={() => setThem(null)} />
              </div>
            </div>
          ) : (
            <div className="card mt-4 space-y-3 p-5">
              <div className="skeleton h-6 w-3/4" />
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-12" />)}
              </div>
            </div>
          )}
        </div>

        <aside className="order-last min-w-0">
          <div className="card p-4 lg:sticky lg:top-4">
            <button type="button" onClick={() => setFeedOpen((o) => !o)} aria-expanded={feedOpen} className="flex w-full items-center justify-between gap-2 text-left">
              <span className="font-display font-bold">Agent activity</span>
              <span className="flex items-center gap-2 text-[11px] text-muted">
                {busy && <span className="dot-pulse h-2 w-2 rounded-full bg-brand" />}
                {events.length} {events.length === 1 ? "event" : "events"}
                <ChevronDown size={16} className={`transition-transform ${feedOpen ? "rotate-180" : ""}`} />
              </span>
            </button>
            {feedOpen && (
              <div className="mt-3">
                <AgentFeed events={events} pending={busy} max={7} />
              </div>
            )}
          </div>
        </aside>
      </div>

      {!step?.done && q && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:px-6">
            <button className="btn-ghost !px-3" disabled={busy || (step?.answered ?? 0) === 0} onClick={() => call("/agent/undo")} aria-label="Undo last answer">
              <Undo2 size={16} /> <span className="hidden sm:inline">Undo</span>
            </button>
            {(step?.answered ?? 0) >= 3 && (
              <button className="btn-ghost !px-3" onClick={finish}><span className="sm:hidden">Matches</span><span className="hidden sm:inline">See matches now</span></button>
            )}
            <button className="btn-primary ml-auto min-w-36 flex-1 sm:flex-none" disabled={busy || !you} onClick={submit}>
              {busy ? <Spinner /> : <>Next <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
