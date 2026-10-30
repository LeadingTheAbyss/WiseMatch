"use client";

import Link from "next/link";
import { BadgeCheck, Home, MapPin, Search } from "lucide-react";
import type { MatchCardData } from "@/lib/types";
import { inr, range } from "@/lib/format";
import { Avatar, ScoreRing } from "./ui";

export function IntentBadge({ m }: { m: Pick<MatchCardData, "intent" | "listing" | "budget_min" | "budget_max"> }) {
  return m.intent === "has_room" ? (
    <span className="inline-flex items-center gap-1 rounded-lg bg-deep px-2 py-1 text-[11px] font-semibold text-white">
      <Home size={12} /> Has a room{m.listing ? ` · ${inr(m.listing.rent)}/mo` : ""}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-lg bg-brand/10 px-2 py-1 text-[11px] font-semibold text-brand">
      <Search size={12} /> Looking · {range(m.budget_min, m.budget_max)}
    </span>
  );
}

export function MatchCard({ m, featured = false, rank }: { m: MatchCardData; featured?: boolean; rank?: number }) {
  return (
    <Link href={`/profile/${m.id}`} className={`card card-hover anim-in relative flex flex-col overflow-hidden p-5 ${featured ? "border-brand/40 bg-gradient-to-br from-brand/10 via-surface to-surface" : ""}`}>
      {rank != null && (
        <span className="absolute left-0 top-0 rounded-br-xl bg-brand px-2.5 py-1 text-[11px] font-bold text-white">#{rank}</span>
      )}
      <div className={`flex items-start gap-3.5 ${rank != null ? "pt-3" : ""}`}>
        <Avatar name={m.name} id={m.id} size={60} src={m.avatar} />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-display text-lg font-bold leading-tight">{m.name}</span>
            {m.verified && <BadgeCheck size={16} className="shrink-0 text-sky-500" aria-label="Verified" />}
          </div>
          <div className="mt-0.5 truncate text-sm text-muted">{m.age} · {m.occupation}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted">
            <MapPin size={12} /> {m.area}{m.distance_km != null ? ` · ${m.distance_km} km` : ""}
          </div>
        </div>
        <ScoreRing score={m.score} size={54} />
      </div>

      {m.reasons.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {m.reasons.map((r) => (
            <li key={r.text} className="flex items-center gap-2.5 text-sm text-ink/90">
              <span className="w-5 text-center">{r.icon}</span>
              <span className="truncate">{r.text}</span>
            </li>
          ))}
        </ul>
      )}

      {m.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {m.tags.map((t) => (
            <span key={t.key} className="chip !bg-surface2 !text-[11px] !font-medium text-muted">{t.emoji} {t.label}</span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3.5" style={{ marginTop: "1.1rem" }}>
        <IntentBadge m={m} />
        <span className="shrink-0 text-[11px] text-muted">{m.last_active}</span>
      </div>
    </Link>
  );
}

export function MatchCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex gap-3.5">
        <div className="skeleton h-[60px] w-[60px] !rounded-full" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-3 w-1/2" />
        </div>
        <div className="skeleton h-[54px] w-[54px] !rounded-full" />
      </div>
      <div className="mt-5 space-y-2.5">
        <div className="skeleton h-3 w-5/6" />
        <div className="skeleton h-3 w-3/4" />
      </div>
    </div>
  );
}
