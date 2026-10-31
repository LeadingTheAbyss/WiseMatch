"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin, Sparkles, MessageCircle, Home } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Stats } from "@/lib/types";
import { Avatar, Logo, Spinner, useCountUp } from "@/components/ui";

const STEPS = [
  { n: 1, title: "Tell us the basics", body: "Area, budget and who you'd like to live with. Takes 20 seconds.", pool: 650 },
  { n: 2, title: "Our agent narrows the field", body: "It asks the one question that splits Bangalore's roommates best, then the next, Akinator-style.", pool: 174 },
  { n: 3, title: "Meet your best matches", body: "Ranked by taste, habits and budget, with a taste graph behind every score.", pool: 9 },
];

export default function Landing() {
  const router = useRouter();
  const { me, loading, signIn } = useAuth();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>("/stats", { auth: false }).then(setStats).catch(() => {});
  }, []);

  const total = useCountUp(stats?.total ?? 0, 1200);
  const rooms = useCountUp(stats?.rooms ?? 0, 1200);

  async function start() {
    setBusy(true);
    setErr("");
    try {
      await signIn(name.trim() || "Guest");
      router.push("/start");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  const strip = stats ? [...stats.points].filter((_, i) => i % 9 === 0).slice(0, 30) : [];

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <div className="flex items-center gap-3">
          {!loading && me && (
            <button className="btn-ghost" onClick={() => router.push(me.onboarded ? "/discover" : "/start")}>
              Continue <ArrowRight size={15} />
            </button>
          )}
        </div>
      </header>

      <section className="grid items-center gap-10 py-10 lg:grid-cols-[1.1fr_1fr] lg:py-16">
        <div className="anim-in">
          <span className="chip mb-5 border-brand/40 bg-brand/10 text-brand">
            <MapPin size={13} /> Bangalore · {stats ? `${stats.total}+ people` : "650+ people"} already here
          </span>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Find roommates who <span className="grad-text">match your vibe</span>.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Skip the 50-field forms. An AI agent asks the fewest, sharpest questions, grounded in what people actually love, and brings Bangalore down to the handful of people you&apos;d genuinely enjoy living with.
          </p>

          <div className="card mt-8 max-w-xl p-3 sm:p-4">
            <label className="label" htmlFor="name">
              What should we call you?
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="name" className="input" placeholder="Your first name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && start()} maxLength={40} />
              <button className="btn-primary shrink-0 sm:px-6" onClick={start} disabled={busy}>
                {busy ? <Spinner /> : <>Find my people <ArrowRight size={16} /></>}
              </button>
            </div>
            {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
            <p className="mt-2 text-xs text-muted">No sign-up needed. One tap guest access, fully pre-filled demo city.</p>
          </div>

          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[
              { v: total, l: "people in Bangalore" },
              { v: rooms, l: "rooms on offer" },
              { v: stats?.areas.length ?? 28, l: "neighbourhoods" },
            ].map((s) => (
              <div key={s.l} className="card px-3 py-3 text-center">
                <div className="font-display text-2xl font-bold sm:text-3xl">{s.v}</div>
                <div className="text-[11px] text-muted sm:text-xs">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative anim-in" style={{ animationDelay: "120ms" }}>
          <div className="card relative overflow-hidden p-5">
            <div className="mb-4 flex items-center justify-between text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="dot-pulse h-2 w-2 rounded-full bg-good" /> Agent narrowing live
              </span>
              <span>Question 4 of ~8</span>
            </div>
            <div className="font-display text-xl font-semibold">Do you vibe with indie &amp; acoustic music?</div>
            <div className="mt-4 grid grid-cols-2 divide-x divide-line rounded-xl border border-line">
              {[
                { t: "You", o: ["👍 Yes, I'm into it", "🙅 Not really"], on: 0 },
                { t: "Them", o: ["🤝 Into it too", "🌿 Doesn't matter"], on: 1 },
              ].map((c) => (
                <div key={c.t} className="p-3">
                  <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-muted">{c.t}</div>
                  <div className="grid gap-1.5">
                    {c.o.map((o, i) => (
                      <div key={o} className={`rounded-lg border px-2.5 py-2 text-xs ${i === c.on ? "border-brand bg-brand/15" : "border-line bg-surface2"}`}>
                        {o}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                <div className="h-full w-[28%] rounded-full" style={{ backgroundImage: "linear-gradient(90deg,#8b5cf6,#a78bfa)" }} />
              </div>
              <span className="text-xs font-semibold">650 → 174</span>
            </div>
          </div>
          <div className="card absolute -bottom-5 -left-3 hidden items-center gap-3 p-3 shadow-2xl shadow-black/40 sm:flex">
            <Avatar name="Ananya Rao" id={7} size={38} src="https://images.pexels.com/photos/37951162/pexels-photo-37951162.jpeg?auto=compress&cs=tinysrgb&w=240&h=240&fit=crop" />
            <div>
              <div className="text-sm font-semibold">Ananya · Indiranagar</div>
              <div className="text-xs text-good">96% match · both into indie music</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mb-6 text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">How WiseMatch finds your people</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.n} className="card anim-in p-5" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-brand/15 font-display font-bold text-brand">{s.n}</div>
              <div className="font-display text-lg font-semibold">{s.title}</div>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold grad-text">{s.pool}</span>
                <span className="text-xs text-muted">people still in the running</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {strip.length > 0 && (
        <section className="overflow-hidden py-8">
          <div className="mb-4 text-center text-sm text-muted">A few of the people already on WiseMatch</div>
          <div className="relative">
            <div className="marquee flex w-max gap-3">
              {[...strip, ...strip].map((p, i) => (
                <div key={`${p.id}-${i}`} className="card flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={p.name} id={p.id} size={36} src={p.avatar} />
                  <div>
                    <div className="text-sm font-semibold">{p.name.split(" ")[0]}</div>
                    <div className="flex items-center gap-1 text-[11px] text-muted">
                      {p.intent === "has_room" ? <Home size={11} /> : <MessageCircle size={11} />} {p.area}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="my-8 overflow-hidden rounded-3xl bg-deep px-4 py-10 sm:px-10">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-5 shadow-xl sm:p-6">
          <h2 className="font-display text-xl font-bold sm:text-2xl">Start searching for a roommate today</h2>
          <p className="mt-1 text-sm text-muted">{stats ? stats.total : "650"}+ people across 28 Bangalore neighbourhoods are already on WiseMatch.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input id="name2" className="input" placeholder="Your first name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && start()} maxLength={40} aria-label="Your first name" />
            <button className="btn-primary shrink-0 sm:px-6" onClick={start} disabled={busy}>
              {busy ? <Spinner /> : <>Get started <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-line py-6 text-center text-xs text-muted">
        WiseMatch · MIT licensed
      </footer>
    </main>
  );
}
