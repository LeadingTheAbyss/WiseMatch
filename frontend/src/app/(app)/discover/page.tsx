"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Heart, LayoutGrid, Map as MapIcon, MapPin, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { MatchCardData, Stats } from "@/lib/types";
import { MatchCard, MatchCardSkeleton } from "@/components/MatchCard";
import { Avatar, EmptyState, ScoreRing } from "@/components/ui";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="skeleton h-[480px]" /> });

interface MatchesRes {
  total: number;
  pool: { initial: number; remaining: number };
  answered: number;
  items: MatchCardData[];
}
interface LikesRes {
  liked_you: MatchCardData[];
  matches: MatchCardData[];
}
interface Filters {
  areas: string[];
  intent: string;
  genders: string[];
  minAge: string;
  maxAge: string;
  minBudget: string;
  maxBudget: string;
  minScore: number;
  verified: boolean;
}

const EMPTY: Filters = { areas: [], intent: "", genders: [], minAge: "", maxAge: "", minBudget: "", maxBudget: "", minScore: 0, verified: false };
const PAGE = 24;
const BUDGETS: [string, string, string][] = [
  ["Under ₹10k", "", "10000"],
  ["₹10k – 15k", "10000", "15000"],
  ["₹15k – 20k", "15000", "20000"],
  ["₹20k – 30k", "20000", "30000"],
  ["₹30k & above", "30000", ""],
];
const SORTS = [
  ["score", "Best match"],
  ["budget_asc", "Budget: low to high"],
  ["budget_desc", "Budget: high to low"],
  ["age_asc", "Age: youngest first"],
  ["age_desc", "Age: oldest first"],
];
const GENDERS: [string, string][] = [["male", "Men"], ["female", "Women"], ["non-binary", "Non-binary"]];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line py-4 first:pt-0 last:border-0">
      <h3 className="mb-2.5 text-sm font-bold">{title}</h3>
      {children}
    </div>
  );
}

function Radio({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2.5 py-1 text-left text-sm">
      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${on ? "border-brand" : "border-line"}`}>{on && <span className="h-2 w-2 rounded-full bg-brand" />}</span>
      <span className={on ? "font-semibold text-brand" : "text-ink/85"}>{label}</span>
    </button>
  );
}

function Check({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2.5 py-1 text-left text-sm">
      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border-2 text-[10px] text-white ${on ? "border-brand bg-brand" : "border-line"}`}>{on ? "✓" : ""}</span>
      <span className={on ? "font-semibold text-brand" : "text-ink/85"}>{label}</span>
    </button>
  );
}

function FilterPanel({ f, set, areaNames }: { f: Filters; set: (p: Partial<Filters>) => void; areaNames: string[] }) {
  const [loc, setLoc] = useState("");
  const [focus, setFocus] = useState(false);
  const suggestions = useMemo(() => {
    const q = loc.trim().toLowerCase();
    return areaNames.filter((a) => !f.areas.includes(a) && (q ? a.toLowerCase().includes(q) : true)).slice(0, q ? 8 : 6);
  }, [loc, areaNames, f.areas]);
  const addArea = (a: string) => {
    set({ areas: [...f.areas, a] });
    setLoc("");
  };
  const presetOn = (min: string, max: string) => f.minBudget === min && f.maxBudget === max;

  return (
    <div>
      <Group title="Location">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !py-2 !pl-9" placeholder="Search a neighbourhood" value={loc} onChange={(e) => setLoc(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} />
          {focus && suggestions.length > 0 && (
            <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-xl shadow-purple-900/10">
              {suggestions.map((a) => (
                <button key={a} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => addArea(a)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface2">
                  <MapPin size={13} className="text-brand" /> {a}
                </button>
              ))}
            </div>
          )}
        </div>
        {f.areas.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {f.areas.map((a) => (
              <button key={a} type="button" onClick={() => set({ areas: f.areas.filter((x) => x !== a) })} className="chip border-brand/40 bg-brand/10 text-brand">
                {a} <X size={12} />
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted">All of Bangalore</p>
        )}
      </Group>

      <Group title="Budget per month">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">₹</span>
            <input className="input !py-2 !pl-6" inputMode="numeric" placeholder="Min" value={f.minBudget} onChange={(e) => set({ minBudget: e.target.value.replace(/\D/g, "") })} aria-label="Minimum budget" />
          </div>
          <span className="text-muted">–</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">₹</span>
            <input className="input !py-2 !pl-6" inputMode="numeric" placeholder="Max" value={f.maxBudget} onChange={(e) => set({ maxBudget: e.target.value.replace(/\D/g, "") })} aria-label="Maximum budget" />
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {BUDGETS.map(([label, min, max]) => (
            <button key={label} type="button" onClick={() => set(presetOn(min, max) ? { minBudget: "", maxBudget: "" } : { minBudget: min, maxBudget: max })}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${presetOn(min, max) ? "border-brand bg-brand text-white" : "border-line bg-white text-ink/80 hover:border-brand/50"}`}>
              {label}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Looking for">
        <Radio on={f.intent === ""} label="Everyone" onClick={() => set({ intent: "" })} />
        <Radio on={f.intent === "has_room"} label="Has a room to share" onClick={() => set({ intent: "has_room" })} />
        <Radio on={f.intent === "seeking"} label="Looking for a room" onClick={() => set({ intent: "seeking" })} />
      </Group>

      <Group title="Gender">
        {GENDERS.map(([v, l]) => (
          <Check key={v} on={f.genders.includes(v)} label={l} onClick={() => set({ genders: f.genders.includes(v) ? f.genders.filter((x) => x !== v) : [...f.genders, v] })} />
        ))}
      </Group>

      <Group title="Age">
        <div className="flex items-center gap-2">
          <input className="input !py-2" inputMode="numeric" placeholder="Min" value={f.minAge} onChange={(e) => set({ minAge: e.target.value.replace(/\D/g, "").slice(0, 2) })} aria-label="Minimum age" />
          <span className="text-muted">–</span>
          <input className="input !py-2" inputMode="numeric" placeholder="Max" value={f.maxAge} onChange={(e) => set({ maxAge: e.target.value.replace(/\D/g, "").slice(0, 2) })} aria-label="Maximum age" />
        </div>
      </Group>

      <Group title="Match score">
        {([[0, "Any"], [70, "70% & up"], [80, "80% & up"], [90, "90% & up"]] as [number, string][]).map(([v, l]) => (
          <Radio key={v} on={f.minScore === v} label={l} onClick={() => set({ minScore: v })} />
        ))}
      </Group>

      <Group title="Trust">
        <Check on={f.verified} label="Verified profiles only" onClick={() => set({ verified: !f.verified })} />
      </Group>
    </div>
  );
}

export default function Discover() {
  const { me } = useAuth();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("score");
  const [f, setF] = useState<Filters>(EMPTY);
  const [view, setView] = useState<"list" | "map">("list");
  const [drawer, setDrawer] = useState(false);

  const [data, setData] = useState<MatchesRes | null>(null);
  const [items, setItems] = useState<MatchCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [likes, setLikes] = useState<LikesRes | null>(null);

  const set = (p: Partial<Filters>) => setF((prev) => ({ ...prev, ...p }));

  const query = useMemo(() => {
    const p = new URLSearchParams({ sort, limit: String(PAGE) });
    if (q.trim()) p.set("q", q.trim());
    if (f.areas.length) p.set("areas", f.areas.join(","));
    if (f.intent) p.set("intent", f.intent);
    if (f.genders.length) p.set("gender", f.genders.join(","));
    if (f.minAge) p.set("min_age", f.minAge);
    if (f.maxAge) p.set("max_age", f.maxAge);
    if (f.minBudget) p.set("min_budget", f.minBudget);
    if (f.maxBudget) p.set("max_budget", f.maxBudget);
    if (f.minScore) p.set("min_score", String(f.minScore));
    if (f.verified) p.set("verified", "true");
    return p.toString();
  }, [q, sort, f]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<MatchesRes>(`/matches?${query}`);
      setData(r);
      setItems(r.items);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 280);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    api<Stats>("/stats", { auth: false }).then(setStats).catch(() => {});
    api<LikesRes>("/likes").then(setLikes).catch(() => {});
  }, []);

  async function loadMore() {
    setMore(true);
    try {
      const r = await api<MatchesRes>(`/matches?${query}&offset=${items.length}`);
      setItems((p) => [...p, ...r.items]);
    } finally {
      setMore(false);
    }
  }

  const areaNames = useMemo(() => (stats ? [...stats.areas].map((a) => a.name).sort() : []), [stats]);
  const active: { key: string; label: string; clear: () => void }[] = [];
  f.areas.forEach((a) => active.push({ key: `a-${a}`, label: a, clear: () => set({ areas: f.areas.filter((x) => x !== a) }) }));
  if (f.minBudget || f.maxBudget) active.push({ key: "budget", label: `₹${f.minBudget || "0"} – ${f.maxBudget ? "₹" + f.maxBudget : "any"}`, clear: () => set({ minBudget: "", maxBudget: "" }) });
  if (f.intent) active.push({ key: "intent", label: f.intent === "has_room" ? "Has a room" : "Looking for a room", clear: () => set({ intent: "" }) });
  f.genders.forEach((g) => active.push({ key: `g-${g}`, label: GENDERS.find((x) => x[0] === g)?.[1] ?? g, clear: () => set({ genders: f.genders.filter((x) => x !== g) }) }));
  if (f.minAge || f.maxAge) active.push({ key: "age", label: `Age ${f.minAge || "18"}–${f.maxAge || "70"}`, clear: () => set({ minAge: "", maxAge: "" }) });
  if (f.minScore) active.push({ key: "score", label: `${f.minScore}%+ match`, clear: () => set({ minScore: 0 }) });
  if (f.verified) active.push({ key: "ver", label: "Verified", clear: () => set({ verified: false }) });
  const filtered = active.length > 0 || q !== "";
  const clearAll = () => {
    setF(EMPTY);
    setQ("");
  };
  const featuredCount = !filtered && sort === "score" ? 3 : 0;
  const first = me?.name.split(" ")[0] ?? "";
  const needsAgent = (data?.answered ?? 0) < 4;

  const panel = <FilterPanel f={f} set={set} areaNames={areaNames} />;

  return (
    <div className="lg:flex lg:gap-6">
      {/* filters sidebar */}
      <aside className="sticky top-5 hidden max-h-[calc(100dvh-2.5rem)] w-[270px] shrink-0 self-start overflow-y-auto rounded-2xl border border-line bg-white p-4 lg:block">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Filters</h2>
          {active.length > 0 && <button onClick={clearAll} className="text-xs font-semibold text-brand hover:underline">Clear all</button>}
        </div>
        {panel}
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        {/* heading */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Find your roommate, {first}</h1>
            <p className="mt-1 text-sm text-muted">
              {data ? <><b className="text-ink">{data.total}</b> {data.total === 1 ? "person" : "people"} in Bangalore</> : "Searching…"}
              {needsAgent && <> · <Link href="/onboarding" className="font-semibold text-brand hover:underline">Answer a few questions to sharpen your matches</Link></>}
            </p>
          </div>
          <Link href="/onboarding" className="btn-primary"><Sparkles size={16} /> Refine my matches</Link>
        </div>

        {/* search + sort row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input !pl-9" placeholder="Search by name, job or area" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn-ghost lg:hidden" onClick={() => setDrawer(true)}>
            <SlidersHorizontal size={16} /> Filters{active.length ? ` (${active.length})` : ""}
          </button>
          <label className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted sm:inline">Sort by</span>
            <select className="input !w-auto !py-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <div className="flex rounded-xl border border-line bg-white p-1">
            {([["list", LayoutGrid], ["map", MapIcon]] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)} aria-label={v} className={`grid h-8 w-10 place-items-center rounded-lg transition ${view === v ? "bg-brand text-white" : "text-muted hover:text-ink"}`}>
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        {active.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {active.map((a) => (
              <button key={a.key} onClick={a.clear} className="chip border-brand/30 bg-brand/10 text-brand">{a.label} <X size={12} /></button>
            ))}
            <button onClick={clearAll} className="text-xs font-semibold text-brand hover:underline">Clear all</button>
          </div>
        )}

        {/* liked you */}
        {likes && likes.liked_you.length > 0 && !filtered && (
          <section>
            <h2 className="mb-2 flex items-center gap-2 font-display text-base font-bold"><Heart size={15} className="text-brand" /> Liked you <span className="chip !py-0">{likes.liked_you.length}</span></h2>
            <div className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
              {likes.liked_you.map((p) => (
                <Link key={p.id} href={`/profile/${p.id}`} className="card card-hover flex w-[200px] shrink-0 items-center gap-3 p-3">
                  <Avatar name={p.name} id={p.id} size={44} ring />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{p.name.split(" ")[0]}, {p.age}</div>
                    <div className="truncate text-[11px] text-muted">{p.area}</div>
                  </div>
                  <ScoreRing score={p.score} size={36} stroke={4} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {view === "map" && stats ? (
          <MapView stats={stats} you={null} selected={f.areas} onPickArea={(a) => { set({ areas: f.areas.includes(a) ? f.areas.filter((x) => x !== a) : [...f.areas, a] }); setView("list"); }} />
        ) : loading && items.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <MatchCardSkeleton key={i} />)}</div>
        ) : items.length === 0 ? (
          <div className="card"><EmptyState icon="🔎" title="No one matches these filters" body="Try widening the budget, age or location." /></div>
        ) : (
          <>
            <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
              {items.map((m, i) => <MatchCard key={m.id} m={m} featured={i < featuredCount} rank={i < featuredCount ? i + 1 : undefined} />)}
            </div>
            {data && items.length < data.total && (
              <div className="pt-2 text-center">
                <button className="btn-ghost" onClick={loadMore} disabled={more}>{more ? "Loading…" : `Show more (${data.total - items.length} left)`}</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* mobile filters drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-deep/50" onClick={() => setDrawer(false)} />
          <div className="anim-in absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl bg-white">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-lg font-bold">Filters</h2>
              <div className="flex items-center gap-4">
                {active.length > 0 && <button onClick={clearAll} className="text-sm font-semibold text-brand">Clear all</button>}
                <button onClick={() => setDrawer(false)} aria-label="Close"><X size={20} /></button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{panel}</div>
            <div className="border-t border-line p-4">
              <button className="btn-primary w-full !py-3" onClick={() => setDrawer(false)}>Show {data ? data.total : ""} results</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
