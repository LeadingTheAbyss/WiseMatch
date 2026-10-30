"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { inrFull } from "@/lib/format";
import type { Catalog, Me } from "@/lib/types";
import { Logo, Spinner } from "@/components/ui";

const MOVE_IN = ["Immediately", "Within 2 weeks", "1 Dec", "1 Jan", "Flexible"];

function Pick({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition ${on ? "border-brand bg-brand/15 text-white" : "border-line bg-surface2 text-ink/80 hover:border-brand/50"}`}
    >
      {children}
    </button>
  );
}

export default function Start() {
  const router = useRouter();
  const { me, loading, setMe } = useAuth();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({
    name: "", age: 25, gender: "male", occupation: "", area: "Koramangala",
    budget_min: 12000, budget_max: 24000, move_in: "Flexible", intent: "seeking", gender_pref: "any",
  });

  useEffect(() => {
    if (!loading && !me) router.replace("/");
    if (me) setF((p) => (p.name ? p : { ...p, name: me.name === "New roommate" ? "" : me.name }));
  }, [loading, me, router]);
  useEffect(() => {
    api<Catalog>("/catalog", { auth: false }).then(setCat).catch(() => {});
  }, []);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const steps = ["About you", "Where & budget", "What you're after"];
  const valid = step === 0 ? f.name.trim().length > 0 && f.age >= 18 : true;

  async function finish() {
    setBusy(true);
    setErr("");
    try {
      const updated = await api<Me>("/me/basics", { method: "PUT", body: f });
      setMe(updated);
      router.push("/onboarding");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 py-5 sm:px-6">
      <div className="flex items-center justify-between">
        <Logo />
        <span className="text-xs text-muted">Step {step + 1} of 3</span>
      </div>
      <div className="mt-4 flex gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? "bg-brand" : "bg-line"}`} />
        ))}
      </div>

      <div key={step} className="anim-in mt-8 flex-1">
        <h1 className="font-display text-3xl font-bold">{steps[step]}</h1>

        {step === 0 && (
          <div className="mt-6 space-y-5">
            <div>
              <label className="label">Your name</label>
              <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Kamlesh Singh" maxLength={60} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Age</label>
                <input className="input" type="number" min={18} max={70} value={f.age} onChange={(e) => set("age", Number(e.target.value))} />
              </div>
              <div>
                <label className="label">Occupation</label>
                <input className="input" value={f.occupation} onChange={(e) => set("occupation", e.target.value)} placeholder="Product designer" maxLength={80} />
              </div>
            </div>
            <div>
              <label className="label">I am</label>
              <div className="grid grid-cols-3 gap-2">
                {[["male", "Man"], ["female", "Woman"], ["non-binary", "Non-binary"]].map(([v, l]) => (
                  <Pick key={v} on={f.gender === v} onClick={() => set("gender", v)}>{l}</Pick>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-6">
            <div>
              <label className="label">Neighbourhood</label>
              <div className="no-scrollbar flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-xl border border-line bg-surface p-2.5">
                {(cat?.areas ?? []).map((a) => (
                  <button key={a.name} type="button" onClick={() => set("area", a.name)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${f.area === a.name ? "border-brand bg-brand/20 text-white" : "border-line bg-surface2 text-ink/80 hover:border-brand/50"}`}>
                    {a.name}
                  </button>
                ))}
                {!cat && <Spinner />}
              </div>
            </div>
            <div>
              <label className="label">Monthly budget (your share)</label>
              <div className="card p-4">
                <div className="mb-3 flex items-baseline justify-between font-display text-lg font-semibold">
                  <span>{inrFull(f.budget_min)}</span>
                  <span className="text-sm font-normal text-muted">to</span>
                  <span>{inrFull(f.budget_max)}</span>
                </div>
                <input type="range" min={5000} max={50000} step={500} value={f.budget_min} onChange={(e) => set("budget_min", Math.min(Number(e.target.value), f.budget_max - 1000))} className="w-full accent-violet-500" aria-label="Minimum budget" />
                <input type="range" min={5000} max={50000} step={500} value={f.budget_max} onChange={(e) => set("budget_max", Math.max(Number(e.target.value), f.budget_min + 1000))} className="mt-2 w-full accent-pink-500" aria-label="Maximum budget" />
              </div>
            </div>
            <div>
              <label className="label">Moving in</label>
              <div className="flex flex-wrap gap-2">
                {MOVE_IN.map((m) => (
                  <button key={m} type="button" onClick={() => set("move_in", m)} className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${f.move_in === m ? "border-brand bg-brand/20 text-white" : "border-line bg-surface2 text-ink/80 hover:border-brand/50"}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-6">
            <div>
              <label className="label">I&apos;m…</label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Pick on={f.intent === "seeking"} onClick={() => set("intent", "seeking")}>
                  <div className="text-base">🔍 Looking for a room</div>
                  <div className="text-xs font-normal text-muted">Find a flatmate and a place</div>
                </Pick>
                <Pick on={f.intent === "has_room"} onClick={() => set("intent", "has_room")}>
                  <div className="text-base">🏠 I have a room</div>
                  <div className="text-xs font-normal text-muted">Find someone to share with</div>
                </Pick>
              </div>
            </div>
            <div>
              <label className="label">I&apos;d like to live with</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[["any", "Anyone"], ["same", "Same gender"], ["male", "Men"], ["female", "Women"]].map(([v, l]) => (
                  <Pick key={v} on={f.gender_pref === v} onClick={() => set("gender_pref", v)}>{l}</Pick>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">Gender, budget and area are hard filters. Everything else we&apos;ll learn through a few smart questions.</p>
            </div>
          </div>
        )}
        {err && <p className="mt-4 text-sm text-rose-400">{err}</p>}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-8 flex gap-3 border-t border-line bg-bg/90 px-4 py-4 backdrop-blur sm:mx-0 sm:px-0">
        {step > 0 && (
          <button className="btn-ghost" onClick={() => setStep(step - 1)}>
            <ArrowLeft size={16} /> Back
          </button>
        )}
        {step < 2 ? (
          <button className="btn-primary flex-1" disabled={!valid} onClick={() => setStep(step + 1)}>
            Continue <ArrowRight size={16} />
          </button>
        ) : (
          <button className="btn-primary flex-1" disabled={busy} onClick={finish}>
            {busy ? <Spinner /> : <>Meet the agent <Check size={16} /></>}
          </button>
        )}
      </div>
    </main>
  );
}
