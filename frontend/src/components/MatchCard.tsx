"use client";

import Link from "next/link";
import { BadgeCheck, Home, MapPin, Search } from "lucide-react";
import type { MatchCardData } from "@/lib/types";
import { inr, range, scoreLabel } from "@/lib/format";
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
    <Link href={`/profile/${m.id}`} className={`card card-hover anim-in relative block overflow-hidden p-4 ${featured ? "border-brand/40 bg-gradient-to-br from-brand/10 via-surface to-surface" : ""}`}>
      {rank != null && (
        <span className="absolute left-0 top-0 rounded-br-xl bg-gradient-to-r from-brand to-brand2 px-2.5 py-1 text-[11px] font-bold text-white">#{rank}</span>
      )}
      <div className={`flex items-start gap-3 ${rank != null ? "pt-4" : ""}`}>
        <Avatar name={m.name} id={m.id} size={featured ? 60 : 52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-display text-base font-semibold">{m.name}</span>
            <span className="text-sm text-muted">{m.age}</span>
            {m.verified && <BadgeCheck size={15} className="shrink-0 text-sky-400" aria-label="Verified" />}
          </div>
          <div className="truncate text-xs text-muted">{m.occupation}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted">
            <MapPin size={12} /> {m.area}{m.distance_km != null ? ` · ${m.distance_km} km` : ""}
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <ScoreRing score={m.score} size={featured ? 62 : 54} />
          <span className="text-[10px] font-medium text-muted">{scoreLabel(m.score)}</span>
        </div>
      </div>

      <ul className="mt-3 grid gap-1">
        {m.reasons.map((r) => (
          <li key={r.text} className="flex items-center gap-2 text-[13px] text-ink/90">
            <span className="w-5 text-center">{r.icon}</span>
            <span className="truncate">{r.text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {m.tags.slice(0, 4).map((t) => {
          const shared = m.shared_tags.some((s) => s.key === t.key);
          return (
            <span key={t.key} className={`chip !py-0.5 text-[11px] ${shared ? "border-brand/50 bg-brand/15 text-brand" : ""}`}>
              {t.emoji} {t.label}
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <IntentBadge m={m} />
        <span className="shrink-0 text-[11px] text-muted">{m.last_active}</span>
      </div>
    </Link>
  );
}

export function MatchCardSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex gap-3">
        <div className="skeleton h-[52px] w-[52px] !rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-3 w-1/2" />
        </div>
        <div className="skeleton h-[54px] w-[54px] !rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="skeleton h-3 w-5/6" />
        <div className="skeleton h-3 w-3/4" />
      </div>
    </div>
  );
}
