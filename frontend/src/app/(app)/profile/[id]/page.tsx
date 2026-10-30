"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, MapPin, Send, Sparkles, TriangleAlert, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { genderLabel, inrFull, range, scoreLabel } from "@/lib/format";
import type { Entity, ProfileData } from "@/lib/types";
import { Avatar, Skeleton, ScoreRing, SourceBadge, Spinner } from "@/components/ui";

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
  const [compose, setCompose] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

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
    void load();
    api<Explain>(`/users/${id}/explain`, { method: "POST" })
      .then(setEx)
      .catch(() => {})
      .finally(() => setExLoading(false));
  }, [id, load]);

  function openCompose(draft?: string) {
    const first = p?.name.split(" ")[0] ?? "";
    setText(draft ?? `Hi ${first}! I came across your profile on WiseMatch and think we could be a good fit. Are you still looking?`);
    setCompose(true);
  }

  async function sendRequest() {
    if (!p || !text.trim()) return;
    setSending(true);
    try {
      const r = await api<{ conversation_id: number }>(`/users/${p.id}/request`, { method: "POST", body: { body: text.trim() } });
      router.push(`/chat/${r.conversation_id}`);
    } catch {
      setSending(false);
    }
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
          <Avatar name={p.name} id={p.id} size={96} ring src={p.avatar} />
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
          {!p.conversation ? (
            <button className="btn-primary" onClick={() => openCompose()}><Send size={16} /> Send message request</button>
          ) : p.conversation.status === "accepted" ? (
            <Link href={`/chat/${p.conversation.id}`} className="btn-primary"><Send size={16} /> Open chat</Link>
          ) : p.conversation.incoming ? (
            <Link href={`/chat/${p.conversation.id}`} className="btn-primary">Review their request</Link>
          ) : (
            <Link href={`/chat/${p.conversation.id}`} className="btn-ghost">Request sent · view</Link>
          )}
        </div>
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
                  <button key={t} onClick={() => (p.conversation ? router.push(`/chat/${p.conversation.id}?draft=${encodeURIComponent(t)}`) : openCompose(t))} className="rounded-xl border border-line bg-surface2 px-3 py-2.5 text-left text-sm transition hover:border-brand/60">
                    💬 {t}
                  </button>
                ))}
              </div>
            )}
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

      {compose && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-deep/50 sm:place-items-center sm:p-4" onClick={() => setCompose(false)}>
          <div className="anim-in w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Message {p.name.split(" ")[0]}</h2>
              <button onClick={() => setCompose(false)} aria-label="Close"><X size={20} /></button>
            </div>
            <p className="mt-1 text-sm text-muted">This lands in their message requests. You can chat freely once they accept.</p>
            <textarea className="input mt-4 min-h-28" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} autoFocus />
            {ex && ex.icebreakers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ex.icebreakers.map((t) => (
                  <button key={t} className="chip text-left hover:border-brand/50" onClick={() => setText(t)}>{t.length > 52 ? t.slice(0, 50) + "…" : t}</button>
                ))}
              </div>
            )}
            <button className="btn-primary mt-4 w-full !py-3" disabled={!text.trim() || sending} onClick={sendRequest}>
              {sending ? <Spinner size={16} /> : "Send request"}
            </button>
          </div>
        </div>
      )}

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
