"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, LogOut, Plus, Search, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { inrFull } from "@/lib/format";
import type { Catalog, Entity, Me } from "@/lib/types";
import { Avatar, ScoreRing, SourceBadge, Spinner } from "@/components/ui";

const AMENITIES = ["Wi-Fi", "AC", "Washing machine", "Geyser", "Modular kitchen", "Balcony", "Power backup", "Lift", "Covered parking", "Gym access", "Housekeeping", "RO water", "Attached bath", "Study desk"];

function Section({ title, hint, children, id }: { title: string; hint?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="card p-4 sm:p-5">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {hint && <p className="mb-3 mt-0.5 text-xs text-muted">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </section>
  );
}

function Pill({ on, onClick, children, danger }: { on: boolean; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${on ? (danger ? "border-amber-400 bg-amber-500/15 text-amber-100" : "border-brand bg-brand text-white") : "border-line bg-surface2 text-ink/80 hover:border-brand/50"}`}>
      {children}
    </button>
  );
}

export default function MePage() {
  const router = useRouter();
  const { me, setMe, signOut } = useAuth();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [basics, setBasics] = useState<Partial<Me>>({});
  const [custom, setCustom] = useState("");
  const [customKind, setCustomKind] = useState<"want" | "avoid">("want");
  const [fq, setFq] = useState("");
  const [fres, setFres] = useState<{ source: string; results: Entity[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [listing, setListing] = useState({ title: "", rent: 15000, deposit: 30000, room_type: "Private room", flat_type: "2 BHK", furnishing: "Semi-furnished", amenities: [] as string[], description: "", available_from: "Immediately" });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api<Catalog>("/catalog", { auth: false }).then(setCat).catch(() => {});
  }, []);
  useEffect(() => {
    if (!me) return;
    setBasics({ name: me.name, age: me.age, occupation: me.occupation, area: me.area, budget_min: me.budget_min, budget_max: me.budget_max, move_in: me.move_in, intent: me.intent, gender_pref: me.gender_pref, bio: me.bio, religion: me.religion, languages: me.languages });
    if (me.listing) setListing({ title: me.listing.title, rent: me.listing.rent, deposit: me.listing.deposit, room_type: me.listing.room_type, flat_type: me.listing.flat_type, furnishing: me.listing.furnishing, amenities: me.listing.amenities, description: me.listing.description, available_from: me.listing.available_from });
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (fq.trim().length < 2) return void setFres(null);
    setSearching(true);
    const t = setTimeout(() => {
      api<{ source: string; results: Entity[] }>(`/qloo/search?q=${encodeURIComponent(fq.trim())}`)
        .then(setFres)
        .catch(() => setFres(null))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [fq]);

  if (!me || !cat) {
    return <div className="grid place-items-center py-20 text-muted"><Spinner size={26} /></div>;
  }

  const flash = (m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };
  async function patch(body: Record<string, unknown>, msg = "Saved") {
    setSaving(true);
    try {
      setMe(await api<Me>("/me", { method: "PATCH", body }));
      flash(msg);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }
  const setTrait = (k: string, v: string) => void patch({ traits: { [k]: v } });
  const togglePref = (k: string, v: string, all: string[]) => {
    const cur = me.prefs[k] ?? [];
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    void patch({ prefs: { [k]: next.length >= all.length ? [] : next } });
  };
  const b = <K extends keyof Me>(k: K) => (basics[k] ?? "") as never;
  const completeness = Math.min(100, 30 + me.answered * 6 + (me.bio ? 10 : 0) + me.taste.length * 2);

  async function addFav(e: Entity) {
    try {
      await api("/me/favourites", { method: "POST", body: { name: e.name, type: e.type, id: e.id } });
      setFq("");
      setFres(null);
      setMe(await api<Me>("/me"));
      flash(`Added ${e.name}`);
    } catch {
      flash("Couldn't add that");
    }
  }
  async function removeFav(name: string) {
    await api(`/me/favourites?name=${encodeURIComponent(name)}`, { method: "DELETE" });
    setMe(await api<Me>("/me"));
  }
  async function saveListing() {
    setSaving(true);
    try {
      setMe(await api<Me>("/me/listing", { method: "PUT", body: listing }));
      flash("Room listing saved");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't save listing");
    } finally {
      setSaving(false);
    }
  }
  function addCustom() {
    const t = custom.trim();
    if (!t) return;
    setCustom("");
    void patch({ custom_prefs: [...me!.custom_prefs, { text: t, kind: customKind }] }, "Preference added");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 anim-in">
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-good/40 bg-surface px-4 py-2 text-sm shadow-2xl">
          <Check size={14} className="text-good" /> {toast}
        </div>
      )}

      <div className="card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand2/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <Avatar name={me.name} id={me.id} size={76} ring src={me.avatar} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold">{me.name}</h1>
            <p className="text-sm text-muted">{me.occupation || "Add your occupation"}{me.area ? ` · ${me.area}` : ""}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="chip">📨 {me.counts.requests} message requests</span>
              <span className="chip">💬 {me.counts.unread} unread</span>
              <span className="chip">🧠 {me.answered} agent answers</span>
            </div>
          </div>
          <div className="text-center"><ScoreRing score={completeness} size={64} /><div className="mt-1 text-[10px] text-muted">profile strength</div></div>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          <Link href="/onboarding" className="btn-primary"><Sparkles size={15} /> {me.answered ? "Answer more questions" : "Start agent questions"}</Link>
          <button className="btn-ghost" onClick={() => { signOut(); router.replace("/"); }}><LogOut size={15} /> Sign out</button>
        </div>
      </div>

      <Section title="The basics">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Name</label><input className="input" value={b("name")} onChange={(e) => setBasics({ ...basics, name: e.target.value })} /></div>
          <div><label className="label">Age</label><input className="input" type="number" value={b("age")} onChange={(e) => setBasics({ ...basics, age: Number(e.target.value) })} /></div>
          <div><label className="label">Occupation</label><input className="input" value={b("occupation")} onChange={(e) => setBasics({ ...basics, occupation: e.target.value })} /></div>
          <div>
            <label className="label">Neighbourhood</label>
            <select className="input" value={b("area")} onChange={(e) => setBasics({ ...basics, area: e.target.value })}><option value="">Any location</option>{cat.areas.map((a) => <option key={a.name}>{a.name}</option>)}</select>
          </div>
          <div>
            <label className="label">Budget per month <span className="font-normal normal-case text-muted/70">(optional)</span></label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">₹</span>
                <input className="input !pl-6" inputMode="numeric" placeholder="Min" value={basics.budget_min ? String(basics.budget_min) : ""} onChange={(e) => setBasics({ ...basics, budget_min: Number(e.target.value.replace(/\D/g, "")) || 0 })} aria-label="Minimum budget" />
              </div>
              <span className="text-muted">–</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">₹</span>
                <input className="input !pl-6" inputMode="numeric" placeholder="Max" value={basics.budget_max ? String(basics.budget_max) : ""} onChange={(e) => setBasics({ ...basics, budget_max: Number(e.target.value.replace(/\D/g, "")) || 0 })} aria-label="Maximum budget" />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {([["Under ₹10k", 0, 10000], ["₹10k – 15k", 10000, 15000], ["₹15k – 20k", 15000, 20000], ["₹20k – 30k", 20000, 30000], ["₹30k+", 30000, 60000]] as [string, number, number][]).map(([l, lo, hi]) => (
                <Pill key={l} on={basics.budget_min === lo && basics.budget_max === hi} onClick={() => setBasics({ ...basics, budget_min: lo, budget_max: hi })}>{l}</Pill>
              ))}
              {(basics.budget_min || basics.budget_max) ? <Pill on={false} onClick={() => setBasics({ ...basics, budget_min: 0, budget_max: 0 })}>Clear</Pill> : null}
            </div>
          </div>
          <div>
            <label className="label">I&apos;m</label>
            <div className="flex gap-2">
              <Pill on={basics.intent === "seeking"} onClick={() => setBasics({ ...basics, intent: "seeking" })}>🔍 Looking</Pill>
              <Pill on={basics.intent === "has_room"} onClick={() => setBasics({ ...basics, intent: "has_room" })}>🏠 Has a room</Pill>
            </div>
            <label className="label mt-3">Live with</label>
            <div className="flex flex-wrap gap-2">{[["any", "Anyone"], ["same", "Same gender"], ["male", "Men"], ["female", "Women"]].map(([v, l]) => <Pill key={v} on={basics.gender_pref === v} onClick={() => setBasics({ ...basics, gender_pref: v })}>{l}</Pill>)}</div>
          </div>
          <div className="sm:col-span-2"><label className="label">About you</label><textarea className="input min-h-24" value={b("bio")} onChange={(e) => setBasics({ ...basics, bio: e.target.value })} placeholder="A line or two about your vibe, routine and what you're after." maxLength={400} /></div>
          <div className="sm:col-span-2">
            <label className="label">Languages</label>
            <div className="flex flex-wrap gap-1.5">{cat.languages.map((l) => { const on = (basics.languages ?? []).includes(l); return <Pill key={l} on={on} onClick={() => setBasics({ ...basics, languages: on ? (basics.languages ?? []).filter((x) => x !== l) : [...(basics.languages ?? []), l] })}>{l}</Pill>; })}</div>
          </div>
        </div>
        <button className="btn-primary mt-4" disabled={saving} onClick={() => patch(basics, "Profile saved")}>{saving ? <Spinner size={15} /> : "Save changes"}</button>
      </Section>

      <Section title="About me" hint="Tap to change. The agent fills these in for you, but you can fix them any time.">
        <div className="space-y-4">
          {cat.traits.map((t) => (
            <div key={t.key}>
              <div className="label">{t.text}</div>
              <div className="flex flex-wrap gap-1.5">{t.options.map((o) => <Pill key={o.value} on={me.traits[t.key] === o.value} onClick={() => setTrait(t.key, o.value)}>{o.emoji} {o.label}</Pill>)}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="What I want in a roommate" hint="Leave on “anyone” if it doesn't matter. 🔒 deal-breakers remove people outright, the rest only change the match score.">
        <div className="space-y-4">
          {cat.traits.map((t) => {
            const sel = me.prefs[t.key] ?? [];
            const all = t.options.map((o) => o.value);
            return (
              <div key={t.key}>
                <div className="label">{t.hard && "🔒 "}{t.them}</div>
                <div className="flex flex-wrap gap-1.5">
                  <Pill on={sel.length === 0} onClick={() => patch({ prefs: { [t.key]: [] } })}>Anyone</Pill>
                  {t.options.map((o) => <Pill key={o.value} danger={t.hard} on={sel.includes(o.value)} onClick={() => togglePref(t.key, o.value, all)}>{o.emoji} {o.label}</Pill>)}
                </div>
              </div>
            );
          })}
          <div>
            <div className="label">Religion <span className="normal-case text-muted/70">(optional, only changes the score)</span></div>
            <div className="flex flex-wrap gap-1.5">
              <Pill on={!(me.prefs.religion ?? []).length} onClick={() => patch({ prefs: { religion: [] } })}>No preference</Pill>
              {cat.religions.filter((r) => r !== "Prefer not to say").map((r) => {
                const sel = me.prefs.religion ?? [];
                return <Pill key={r} on={sel.includes(r)} onClick={() => patch({ prefs: { religion: sel.includes(r) ? sel.filter((x) => x !== r) : [...sel, r] } })}>{r}</Pill>;
              })}
            </div>
            <div className="label mt-3">My religion</div>
            <select className="input !w-auto" value={me.religion} onChange={(e) => patch({ religion: e.target.value })}>
              <option value="">Prefer not to say</option>
              {cat.religions.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </Section>

      <Section title="Anything else?" hint="Add your own preferences in plain words, for example “has a dog”, “works in design” or “plays guitar”.">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="input" placeholder="e.g. loves board games" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustom()} maxLength={100} />
          <div className="flex gap-2">
            <Pill on={customKind === "want"} onClick={() => setCustomKind("want")}>👍 Want</Pill>
            <Pill on={customKind === "avoid"} danger onClick={() => setCustomKind("avoid")}>🚫 Avoid</Pill>
            <button className="btn-primary !px-3" onClick={addCustom} aria-label="Add"><Plus size={16} /></button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {me.custom_prefs.length === 0 && <span className="text-xs text-muted">Nothing added yet.</span>}
          {me.custom_prefs.map((p, i) => (
            <span key={i} className={`chip ${p.kind === "avoid" ? "border-amber-500/40 text-amber-700" : "border-good/40 text-emerald-700"}`}>
              {p.kind === "avoid" ? "🚫" : "👍"} {p.text}
              <button onClick={() => patch({ custom_prefs: me.custom_prefs.filter((_, j) => j !== i) }, "Removed")} aria-label="Remove"><X size={12} /></button>
            </span>
          ))}
        </div>
      </Section>

      <Section title="My taste" hint="Search Qloo's taste graph for artists, films, restaurants and more. Everything here feeds your matches.">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !pl-9" placeholder="Search e.g. Prateek Kuhad, Toit, Dune…" value={fq} onChange={(e) => setFq(e.target.value)} />
          {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"><Spinner size={14} /></span>}
        </div>
        {fres && (
          <div className="card anim-in mt-2 overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-3 py-1.5 text-[11px] text-muted"><span>{fres.results.length} results</span><SourceBadge source={fres.source === "live" ? "qloo" : "mock"} /></div>
            {fres.results.length === 0 && <div className="px-3 py-4 text-sm text-muted">Nothing found. Try another name.</div>}
            {fres.results.map((r) => (
              <button key={r.id} onClick={() => addFav(r)} className="flex w-full items-center justify-between gap-3 border-b border-line/60 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-surface2">
                <span><b>{r.name}</b> <span className="text-xs text-muted">· {r.type.replace("_", " ")}</span></span>
                <Plus size={15} className="text-brand" />
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {me.taste.length === 0 && <span className="text-xs text-muted">No favourites yet. Add a few to sharpen your matches.</span>}
          {me.taste.map((e) => (
            <span key={e.id} className="chip">{e.name}<button onClick={() => removeFav(e.name)} aria-label={`Remove ${e.name}`}><X size={12} /></button></span>
          ))}
        </div>
        {me.tags.length > 0 && (
          <>
            <div className="label mt-4">Vibes the agent picked up</div>
            <div className="flex flex-wrap gap-1.5">{me.tags.map((t) => <span key={t.key} className="chip border-brand/40 bg-brand/10">{t.emoji} {t.label}</span>)}</div>
          </>
        )}
      </Section>

      <Section title={me.listing ? "Your room" : "Have a room to offer?"} hint="Seekers get matched with you and your room together.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Title</label><input className="input" value={listing.title} onChange={(e) => setListing({ ...listing, title: e.target.value })} placeholder={`Private room in a 2 BHK, ${me.area}`} /></div>
          <div><label className="label">Monthly rent (₹)</label><input className="input" type="number" value={listing.rent} onChange={(e) => setListing({ ...listing, rent: Number(e.target.value) })} /></div>
          <div><label className="label">Deposit (₹)</label><input className="input" type="number" value={listing.deposit} onChange={(e) => setListing({ ...listing, deposit: Number(e.target.value) })} /></div>
          <div><label className="label">Flat</label><select className="input" value={listing.flat_type} onChange={(e) => setListing({ ...listing, flat_type: e.target.value })}>{["1 BHK", "2 BHK", "3 BHK", "4 BHK"].map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><label className="label">Furnishing</label><select className="input" value={listing.furnishing} onChange={(e) => setListing({ ...listing, furnishing: e.target.value })}>{["Fully furnished", "Semi-furnished", "Unfurnished"].map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="sm:col-span-2"><label className="label">Description</label><textarea className="input min-h-20" value={listing.description} onChange={(e) => setListing({ ...listing, description: e.target.value })} maxLength={400} /></div>
          <div className="sm:col-span-2">
            <label className="label">Amenities</label>
            <div className="flex flex-wrap gap-1.5">{AMENITIES.map((a) => { const on = listing.amenities.includes(a); return <Pill key={a} on={on} onClick={() => setListing({ ...listing, amenities: on ? listing.amenities.filter((x) => x !== a) : [...listing.amenities, a] })}>{a}</Pill>; })}</div>
          </div>
        </div>
        <button className="btn-primary mt-4" disabled={saving || !listing.title.trim()} onClick={saveListing}>{me.listing ? "Update room" : "Publish room"}</button>
      </Section>
    </div>
  );
}
