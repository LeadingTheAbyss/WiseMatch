"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Filter, Heart, Map as MapIcon, LayoutGrid, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { MatchCardData, Stats, TraceEvent } from "@/lib/types";
import { MatchCard, MatchCardSkeleton } from "@/components/MatchCard";
import { Avatar, EmptyState, ScoreRing, useCountUp } from "@/components/ui";
import { AgentFeed } from "@/components/AgentFeed";

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

const PAGE = 24;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Discover() {
  const { me } = useAuth();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("score");
  const [areas, setAreas] = useState<string[]>([]);
  const [intent, setIntent] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [verified, setVerified] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [showAreas, setShowAreas] = useState(false);

  const [data, setData] = useState<MatchesRes | null>(null);
  const [items, setItems] = useState<MatchCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [likes, setLikes] = useState<LikesRes | null>(null);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const lastEvent = useRef(0);

  const query = useMemo(() => {
    const p = new URLSearchParams({ sort, limit: String(PAGE) });
    if (q.trim()) p.set("q", q.trim());
    if (areas.length) p.set("areas", areas.join(","));
    if (intent) p.set("intent", intent);
    if (minScore) p.set("min_score", String(minScore));
    if (verified) p.set("verified", "true");
    return p;
  }, [q, sort, areas, intent, minScore, verified]);

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
    const t = setTimeout(() => void load(), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  useEffect(() => {
    api<Stats>("/stats", { auth: false }).then(setStats).catch(() => {});
    api<LikesRes>("/likes").then(setLikes).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await api<{ events: TraceEvent[] }>(`/agent/trace?after=${lastEvent.current}`, { auth: false });
        if (!alive || r.events.length === 0) return;
        lastEvent.current = r.events[r.events.length - 1].id;
        setEvents((p) => [...p, ...r.events].slice(-40));
      } catch {
        /* ignore */
      }
    };
    void poll();
    const t = setInterval(poll, 3500);
    return () => {
      alive = false;
      clearInterval(t);
    };
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

  const toggleArea = (a: string) => setAreas((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
  const filtered = areas.length > 0 || intent !== "" || minScore > 0 || verified || q !== "";
  const clear = () => {
    setQ(""); setAreas([]); setIntent(""); setMinScore(0); setVerified(false);
  };

  const remaining = useCountUp(data?.pool.remaining ?? 0);
  const first = me?.name.split(" ")[0] ?? "";
  const top = !filtered && sort === "score" ? items.slice(0, 3) : [];
  const rest = !filtered && sort === "score" ? items.slice(3) : items;
  const needsAgent = (data?.answered ?? 0) < 4;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-5">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{greeting()}, {first} 👋</h1>
            <p className="mt-1 text-sm text-muted">
              <b className="text-ink">{remaining}</b> of {data?.pool.initial ?? "…"} people in Bangalore fit your deal-breakers
            </p>
          </div>
          <Link href="/onboarding" className="btn-primary">
            <Sparkles size={16} /> {needsAgent ? "Sharpen my matches" : "Refine with agent"}
          </Link>
        </div>

        {needsAgent && (
          <div className="card flex flex-col gap-3 border-brand/40 bg-gradient-to-r from-brand/10 to-brand2/10 p-4 sm:flex-row sm:items-center">
            <div className="text-3xl">🧠</div>
            <div className="flex-1 text-sm">
              <div className="font-display font-semibold">Your matches get much sharper after a few questions.</div>
              <div className="text-muted">Our agent picks the single best question each time. Most people need 6–8.</div>
            </div>
            <Link href="/onboarding" className="btn-ghost">Answer now</Link>
          </div>
        )}

        {/* liked you */}
        {likes && likes.liked_you.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Heart size={16} className="text-purple-500" /> Liked you <span className="chip !py-0">{likes.liked_you.length}</span></h2>
            </div>
            <div className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
              {likes.liked_you.map((p) => (
                <Link key={p.id} href={`/profile/${p.id}`} className="card card-hover flex w-[150px] shrink-0 flex-col items-center gap-2 p-3 text-center">
                  <Avatar name={p.name} id={p.id} size={56} ring />
                  <div className="w-full truncate text-sm font-semibold">{p.name.split(" ")[0]}, {p.age}</div>
                  <div className="w-full truncate text-[11px] text-muted">{p.area}</div>
                  <ScoreRing score={p.score} size={38} stroke={4} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* controls */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className="input !pl-9" placeholder="Search name, job or area" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              <option value="score">Best match</option>
              <option value="distance">Nearest</option>
              <option value="budget">Lowest budget</option>
            </select>
            <div className="flex rounded-xl border border-line bg-surface2 p-1">
              {([["list", LayoutGrid], ["map", MapIcon]] as const).map(([v, Icon]) => (
                <button key={v} onClick={() => setView(v)} aria-label={v} className={`grid h-8 w-10 place-items-center rounded-lg transition ${view === v ? "bg-brand text-white" : "text-muted hover:text-ink"}`}>
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>

          <div className="no-scrollbar -mx-3 flex items-center gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0">
            {[["", "Everyone"], ["has_room", "🏠 Has a room"], ["seeking", "🔍 Looking"]].map(([v, l]) => (
              <button key={v} onClick={() => setIntent(v)} className={`chip shrink-0 transition ${intent === v ? "border-brand bg-brand text-white" : "hover:border-brand/50"}`}>{l}</button>
            ))}
            <button onClick={() => setVerified(!verified)} className={`chip shrink-0 transition ${verified ? "border-sky-400/60 bg-sky-500/15 text-sky-700" : "hover:border-brand/50"}`}>✓ Verified</button>
            {[0, 70, 80, 90].map((s) => (
              <button key={s} onClick={() => setMinScore(s)} className={`chip shrink-0 transition ${minScore === s ? "border-brand bg-brand text-white" : "hover:border-brand/50"}`}>{s === 0 ? "Any score" : `${s}%+`}</button>
            ))}
            <button onClick={() => setShowAreas(!showAreas)} className={`chip shrink-0 transition ${areas.length ? "border-brand bg-brand text-white" : "hover:border-brand/50"}`}>
              <Filter size={12} /> Areas{areas.length ? ` (${areas.length})` : ""}
            </button>
            {filtered && <button onClick={clear} className="chip shrink-0 text-rose-600"><X size={12} /> Clear</button>}
          </div>
          {showAreas && stats && (
            <div className="card anim-in flex flex-wrap gap-1.5 p-3">
              {stats.areas.map((a) => (
                <button key={a.name} onClick={() => toggleArea(a.name)} className={`chip transition ${areas.includes(a.name) ? "border-brand bg-brand text-white" : "hover:border-brand/50"}`}>
                  {a.name} <span className="text-muted">{a.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {view === "map" && stats ? (
          <MapView stats={stats} you={me ? { lat: stats.areas.find((a) => a.name === me.area)?.lat ?? 12.97, lng: stats.areas.find((a) => a.name === me.area)?.lng ?? 77.59, name: me.name } : null} selected={areas} onPickArea={(a) => { toggleArea(a); setView("list"); }} />
        ) : (
          <>
            {top.length > 0 && (
              <section>
                <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold">🏆 Your top matches</h2>
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {top.map((m, i) => <MatchCard key={m.id} m={m} featured rank={i + 1} />)}
                </div>
              </section>
            )}

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">{filtered || sort !== "score" ? "Results" : "More people you might click with"}</h2>
                <span className="text-xs text-muted">{data ? `${data.total} people` : ""}</span>
              </div>
              {loading && items.length === 0 ? (
                <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <MatchCardSkeleton key={i} />)}</div>
              ) : items.length === 0 ? (
                <div className="card"><EmptyState icon="🔎" title="No one matches those filters" body="Try widening the score or area filters." /></div>
              ) : (
                <div className={`grid gap-3 md:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
                  {rest.map((m) => <MatchCard key={m.id} m={m} />)}
                </div>
              )}
              {data && items.length < data.total && (
                <div className="mt-4 text-center">
                  <button className="btn-ghost" onClick={loadMore} disabled={more}>{more ? "Loading…" : `Show more (${data.total - items.length} left)`}</button>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* right column */}
      <aside className="hidden space-y-4 xl:block">
        <div className="card sticky top-6 space-y-4 p-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display font-semibold">Agent activity</h3>
              <button className="text-muted hover:text-ink" onClick={() => void load()} aria-label="Refresh"><RefreshCw size={14} /></button>
            </div>
            <AgentFeed events={events} max={5} />
          </div>
          {stats && (
            <>
              <div>
                <h3 className="mb-2 font-display font-semibold">What Bangalore loves</h3>
                <div className="flex flex-wrap gap-1.5">
                  {stats.top_tags.slice(0, 8).map((t) => <span key={t.key} className="chip !text-[11px]">{t.emoji} {t.label}</span>)}
                </div>
              </div>
              <div>
                <h3 className="mb-2 font-display font-semibold">Busiest neighbourhoods</h3>
                <div className="space-y-2">
                  {stats.areas.slice(0, 6).map((a) => (
                    <button key={a.name} onClick={() => toggleArea(a.name)} className="block w-full text-left">
                      <div className="mb-0.5 flex justify-between text-xs"><span>{a.name}</span><span className="text-muted">{a.count}</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-gradient-to-r from-brand to-brand2" style={{ width: `${(a.count / stats.areas[0].count) * 100}%` }} /></div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
