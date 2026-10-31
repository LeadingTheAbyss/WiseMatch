"use client";

import { Brain, Crosshair, Network, Users } from "lucide-react";
import type { TraceEvent } from "@/lib/types";
import { SourceBadge } from "./ui";

const ICON = {
  pool: Users,
  taste: Network,
  llm: Brain,
  decide: Crosshair,
};

export function AgentFeed({ events, pending, max = 8 }: { events: TraceEvent[]; pending?: boolean; max?: number }) {
  const rows = [...events].sort((a, b) => b.id - a.id).slice(0, max);
  return (
    <div className="space-y-2">
      {pending && (
        <div className="flex items-center gap-2 rounded-xl border border-brand/40 bg-brand/10 px-3 py-2 text-xs text-brand">
          <span className="dot-pulse h-2 w-2 rounded-full bg-brand" /> Agent is thinking…
        </div>
      )}
      {rows.length === 0 && !pending && <p className="px-1 text-xs text-muted">Agent activity will show up here, including every taste-graph and LLM call.</p>}
      {rows.map((e) => {
        const Icon = ICON[e.kind] ?? Crosshair;
        return (
          <div key={e.id} className={`anim-in rounded-xl border px-3 py-2 ${e.ok ? "border-line bg-surface" : "border-rose-500/30 bg-rose-500/5"}`}>
            <div className="flex items-start gap-2">
              <Icon size={14} className="mt-0.5 shrink-0 text-brand" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold leading-tight">{e.title}</span>
                  <SourceBadge source={e.source} />
                  {e.ms != null && <span className="text-[10px] text-muted">{e.ms}ms</span>}
                </div>
                {e.detail && <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">{e.detail}</p>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
