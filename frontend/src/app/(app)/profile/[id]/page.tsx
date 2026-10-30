"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Heart, MapPin, MessageCircle, Sparkles, TriangleAlert } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { genderLabel, inrFull, range, scoreLabel } from "@/lib/format";
import type { Entity, ProfileData } from "@/lib/types";
import { Avatar, Skeleton, ScoreRing, SourceBadge } from "@/components/ui";

interface Explain {
  summary: string;
  icebreakers: string[];
  source: string;
  spots: Entity[];
  spots_source: string;
}

const DIMS: [keyof ProfileData["breakdown"], string, string][] = [
  ["lifestyle", "Lifestyle & habits", "🏠"],
  ["taste", "Taste & interests", "🎧"],
  ["preferences", "Roommate preferences", "🤝"],
  ["budget", "Budget fit", "💸"],
  ["location", "Location", "📍"],
];

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold sm:text-lg">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Gallery({ hue, count }: { hue: number; count: number }) {
  const tiles = Array.from({ length: Math.min(count, 5) });
  const icons = ["🛏️", "🪟", "🍳", "🛁", "🌇"];
  return (
    <div className="grid h-44 grid-cols-4 grid-rows-2 gap-1.5 overflow-hidden rounded-xl sm:h-56">
      {tiles.map((_, i) => (
        <div
          key={i}
          className={`grid place-items-center text-3xl ${i === 0 ? "col-span-2 row-span-2" : ""}`}
          style={{ background: `linear-gradient(${135 + i * 25}deg, hsl(${(hue + i * 22) % 360} 55% 32%), hsl(${(hue + i * 22 + 40) % 360} 60% 20%))` }}
        >
          <span className={i === 0 ? "text-5xl" : ""}>{icons[i]}</span>
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [p, setP] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");
  const [ex, setEx] = useState<Explain | null>(null);
  const [exLoading, setExLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");

  const load = useCallback(async () => {
    try {
      setP(await api<ProfileData>(`/users/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load this profile");
    }
  }, [id]);

  useEffect(() => {
    setP(null);
    setEx(null);
    setExLoading(true);
    setBanner("");
    void load();
    api<Explain>(`/users/${id}/explain`, { method: "POST" })
      .then(setEx)
      .catch(() => {})
      .finally(() => setExLoading(false));
  }, [id, load]);

  async function toggleLike() {
    if (!p) return;
    setBusy(true);
    try {
      if (p.liked) {
        await api(`/users/${p.id}/like`, { method: "DELETE" });
        setBanner("");
      } else {
        const r = await api<{ mutual: boolean }>(`/users/${p.id}/like`, { method: "POST" });
        setBanner(r.mutual ? "match" : "liked");
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  function chat(draft?: string) {
    if (!p?.conversation_id) return;
    router.push(`/chat/${p.conversation_id}${draft ? `?draft=${encodeURIComponent(draft)}` : ""}`);
  }

  if (error) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <div className="text-4xl">🫥</div>
        <p className="mt-2 text-muted">{error}</p>
        <Link href="/discover" className="btn-ghost mt-4">Back to discover</Link>
      </div>
    );
  }
  if (!p) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-44" />
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      </div>
    );
  }

  const L = p.listing;

  return (
    <div className="mx-auto max-w-5xl space-y-4 anim-in">
      <Link href="/discover" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={15} /> Back</Link>

      {/* hero */}
      <div className="card relative overflow-hidden p-4 sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={p.name} id={p.id} size={96} ring />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{p.name}</h1>
              <span className="text-lg text-muted">{p.age}</span>
              {p.verified && <span className="chip border-sky-500/40 bg-sky-500/10 text-sky-700"><BadgeCheck size={13} /> Verified</span>}
            </div>
            <p className="mt-1 text-sm text-muted">{p.occupation} · {genderLabel(p.gender)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1"><MapPin size={14} /> {p.area}{p.distance_km != null ? ` · ${p.distance_km} km from you` : ""}</span>
              <span>🗓️ Moving in: {p.move_in}</span>
              <span className="text-good">● {p.last_active}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.languages.map((l) => <span key={l} className="chip !py-0.5">🗣️ {l}</span>)}
              {p.religion && p.religion !== "Prefer not to say" && <span className="chip !py-0.5">🙏 {p.religion}</span>}
            </div>
          </div>
          <div className="flex items-center gap-4 sm:flex-col sm:gap-2">
            <ScoreRing score={p.score} size={92} stroke={7} />
            <div className="text-center text-xs font-medium text-muted">{scoreLabel(p.score)}</div>
          </div>
        </div>

        <p className="relative mt-4 text-sm leading-relaxed text-ink/90">{p.bio}</p>

        <div className="relative mt-5 flex flex-wrap items-center gap-2">
          <button onClick={toggleLike} disabled={busy} className={p.liked ? "btn-ghost border-purple-400/60 text-purple-700" : "btn-primary"}>
            <Heart size={16} fill={p.liked ? "currentColor" : "none"} /> {p.liked ? "Liked" : "Like"}
          </button>
          <button className="btn-ghost" disabled={!p.conversation_id} onClick={() => chat()} title={p.conversation_id ? "" : "Both of you need to like each other first"}>
            <MessageCircle size={16} /> {p.conversation_id ? "Message" : "Match to chat"}
          </button>
          {p.liked_me && !p.liked && <span className="chip border-purple-400/40 bg-purple-500/10 text-purple-700">💌 Liked you</span>}
        </div>
        {(banner === "match" || (p.mutual && banner)) && (
          <div className="relative mt-4 rounded-xl border border-purple-400/40 bg-gradient-to-r from-brand/20 to-brand2/20 p-4 text-sm">
            🎉 <b>It&apos;s a match!</b> You and {p.name.split(" ")[0]} liked each other.
            <button className="ml-2 font-semibold text-purple-700 underline underline-offset-4" onClick={() => chat()}>Say hi</button>
          </div>
        )}
        {banner === "liked" && !p.mutual && <div className="relative mt-4 rounded-xl border border-line bg-surface2 p-3 text-sm text-muted">Liked. We&apos;ll let you know if {p.name.split(" ")[0]} likes you back.</div>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <Section title="Why you two could work" right={<SourceBadge source={ex?.source === "groq" ? "groq" : "engine"} />}>
            {exLoading ? (
              <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div>
            ) : (
              <p className="text-sm leading-relaxed text-ink/90">{ex?.summary ?? "You share a few habits and tastes worth talking about."}</p>
            )}
            <ul className="mt-4 grid gap-1.5">
              {p.all_reasons.map((r) => (
                <li key={r.text} className="flex items-center gap-2 text-sm"><span className="w-6 text-center">{r.icon}</span>{r.text}</li>
              ))}
            </ul>
            {p.heads_up.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700">
                {p.heads_up.map((h) => <div key={h} className="flex items-start gap-2"><TriangleAlert size={14} className="mt-0.5 shrink-0" />{h}</div>)}
              </div>
            )}
          </Section>

          <Section title="Compatibility breakdown">
            <div className="space-y-3">
              {DIMS.map(([k, label, icon]) => (
                <div key={k}>
                  <div className="mb-1 flex justify-between text-xs"><span>{icon} {label}</span><b>{p.breakdown[k]}%</b></div>
                  <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.breakdown[k]}%`, backgroundImage: "linear-gradient(90deg,#8b5cf6,#a78bfa)" }} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Taste profile" right={<SourceBadge source="qloo" />}>
            <div className="flex flex-wrap gap-1.5">
              {p.all_tags.map((t) => {
                const shared = p.shared_tags.some((s) => s.key === t.key);
                return <span key={t.key} className={`chip ${shared ? "border-brand/60 bg-brand text-white" : ""}`}>{t.emoji} {t.label}</span>;
              })}
            </div>
            {p.taste.length > 0 && (
              <>
                <div className="label mt-4">Loves</div>
                <div className="flex flex-wrap gap-1.5">
                  {p.taste.map((e) => (
                    <span key={e.id} className={`chip !text-[11px] ${p.shared_entities.includes(e.name) ? "border-good/60 bg-good/10 text-emerald-700" : ""}`}>
                      {e.name}<span className="text-muted">· {e.type.replace("_", " ")}</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Icebreakers" right={<span className="text-[11px] text-muted">tap to send</span>}>
            {exLoading ? (
              <div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
            ) : (
              <div className="grid gap-2">
                {(ex?.icebreakers ?? []).map((t) => (
                  <button key={t} onClick={() => (p.conversation_id ? chat(t) : setBanner("need-like"))} className="rounded-xl border border-line bg-surface2 px-3 py-2.5 text-left text-sm transition hover:border-brand/60">
                    💬 {t}
                  </button>
                ))}
              </div>
            )}
            {banner === "need-like" && !p.conversation_id && <p className="mt-2 text-xs text-amber-700">Like each other first, then you can chat.</p>}
          </Section>

          <Section title="Spots you'd both love" right={<SourceBadge source={ex?.spots_source ?? "mock"} />}>
            {exLoading ? (
              <div className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
            ) : (
              <div className="grid gap-2">
                {(ex?.spots ?? []).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface2 px-3 py-2.5">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/15 text-lg">{s.tags?.includes("cafes") ? "☕" : s.tags?.includes("craft_beer") ? "🍺" : s.tags?.includes("art_theatre") ? "🎭" : s.tags?.includes("books") ? "📚" : "🍽️"}</div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{s.name}</div>
                      <div className="text-[11px] text-muted">{s.locality ?? "Bangalore"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted"><Sparkles size={11} /> Picked from both of your tastes via the Qloo taste graph</p>
          </Section>

          <Section title="Day to day">
            <div className="flex flex-wrap gap-1.5">
              {p.trait_chips.map((t) => <span key={t.key} className="chip">{t.emoji} {t.label}</span>)}
            </div>
            <div className="label mt-4">Budget</div>
            <p className="text-sm">{range(p.budget_min, p.budget_max)} per month</p>
            {p.looking_for.length > 0 && (
              <>
                <div className="label mt-4">Looking for in a roommate</div>
                <ul className="grid gap-1 text-sm">{p.looking_for.map((l) => <li key={l}>• {l}</li>)}</ul>
              </>
            )}
          </Section>
        </div>
      </div>

      {L && (
        <Section title="The room" right={<span className="chip border-purple-400/40 bg-purple-500/10 text-purple-700">{inrFull(L.rent)}/mo</span>}>
          <Gallery hue={L.hue} count={L.photos} />
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="font-display text-lg font-semibold">{L.title}</div>
              <p className="mt-1 text-sm text-muted">{L.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{L.amenities.map((a) => <span key={a} className="chip">✓ {a}</span>)}</div>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-1">
              {[["Rent", inrFull(L.rent)], ["Deposit", inrFull(L.deposit)], ["Type", L.room_type], ["Flat", L.flat_type], ["Furnishing", L.furnishing], ["Available", L.available_from]].map(([k, v]) => (
                <div key={k}><dt className="text-[11px] uppercase tracking-wide text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
          </div>
        </Section>
      )}
    </div>
  );
}
