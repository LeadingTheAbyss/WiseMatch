"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Me } from "@/lib/types";
import { Logo, Spinner } from "@/components/ui";

const GENDERS = [
  ["male", "Man"],
  ["female", "Woman"],
  ["non-binary", "Non-binary"],
];

export default function Start() {
  const router = useRouter();
  const { me, loading, setMe } = useAuth();
  const [f, setF] = useState({ name: "", age: "", occupation: "", gender: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!loading && !me) router.replace("/");
    if (me) setF((p) => (p.name ? p : { ...p, name: me.name === "New roommate" || me.name === "Guest" ? "" : me.name }));
  }, [loading, me, router]);

  const age = Number(f.age);
  const ready = f.name.trim() && age >= 18 && age <= 70 && f.occupation.trim() && f.gender;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setErr("");
    try {
      const updated = await api<Me>("/me/basics", { method: "PUT", body: { name: f.name.trim(), age, occupation: f.occupation.trim(), gender: f.gender } });
      setMe(updated);
      router.push("/onboarding");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't save");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
      <Logo />
      <form onSubmit={submit} className="anim-in mt-10 flex flex-1 flex-col">
        <h1 className="font-display text-3xl font-extrabold">Tell us about you</h1>
        <p className="mt-1 text-sm text-muted">Four quick things. You&apos;ll set location, budget and more as filters when you browse.</p>

        <div className="mt-7 space-y-5">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Kamlesh Singh" maxLength={60} autoFocus required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="age">Age</label>
              <input id="age" className="input" type="number" inputMode="numeric" min={18} max={70} value={f.age} onChange={(e) => setF({ ...f, age: e.target.value })} placeholder="25" required />
            </div>
            <div>
              <label className="label" htmlFor="occ">Occupation</label>
              <input id="occ" className="input" value={f.occupation} onChange={(e) => setF({ ...f, occupation: e.target.value })} placeholder="Product designer" maxLength={80} required />
            </div>
          </div>
          <div>
            <span className="label">I am</span>
            <div className="grid grid-cols-3 gap-2">
              {GENDERS.map(([v, l]) => (
                <button key={v} type="button" onClick={() => setF({ ...f, gender: v })} aria-pressed={f.gender === v}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${f.gender === v ? "border-brand bg-brand text-white shadow-md shadow-brand/25" : "border-line bg-white text-ink/80 hover:border-brand/50"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        {err && <p className="mt-4 text-sm text-rose-600">{err}</p>}

        <div className="mt-auto pt-8">
          <button type="submit" className="btn-primary w-full !py-3.5 text-base" disabled={!ready || busy}>
            {busy ? <Spinner /> : <>Continue <ArrowRight size={17} /></>}
          </button>
          {!ready && <p className="mt-2 text-center text-xs text-muted">All four fields are required.</p>}
        </div>
      </form>
    </main>
  );
}
