"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import type { Conversation } from "@/lib/types";
import { Avatar, EmptyState, Skeleton } from "@/components/ui";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { refresh } = useAuth();
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [q, setQ] = useState("");
  const onThread = pathname !== "/chat";
  const activeId = onThread ? Number(pathname.split("/")[2]) : null;

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await api<{ items: Conversation[] }>("/conversations");
        if (alive) setItems(r.items);
      } catch {
        /* keep previous */
      }
    };
    void load();
    const t = setInterval(() => {
      void load();
      void refresh();
    }, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [refresh, pathname]);

  const shown = (items ?? []).filter((c) => c.other.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="card grid h-[calc(100dvh-9.5rem)] overflow-hidden lg:h-[calc(100dvh-3rem)] lg:grid-cols-[340px_1fr]">
      <div className={`${onThread ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r border-line`}>
        <div className="border-b border-line p-4">
          <h1 className="font-display text-xl font-bold">Chats</h1>
          <div className="relative mt-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input !py-2 !pl-9" placeholder="Search matches" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items === null ? (
            <div className="space-y-3 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : shown.length === 0 ? (
            <EmptyState icon="💬" title="No chats yet" body="Like someone on Discover. When they like you back, you can chat here." />
          ) : (
            shown.map((c) => (
              <Link key={c.id} href={`/chat/${c.id}`} className={`flex items-center gap-3 border-b border-line/60 px-4 py-3 transition hover:bg-surface2 ${activeId === c.id ? "bg-surface2" : ""}`}>
                <Avatar name={c.other.name} id={c.other.id} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1 truncate text-sm font-semibold">
                      <span className="truncate">{c.other.name}</span>
                      {c.other.verified && <BadgeCheck size={13} className="shrink-0 text-sky-400" />}
                    </span>
                    <span className={`shrink-0 text-[11px] ${c.unread ? "font-semibold text-good" : "text-muted"}`}>{c.last ? timeAgo(c.last.at) : ""}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className={`truncate text-[13px] ${c.unread ? "text-ink" : "text-muted"}`}>
                      {c.last ? `${c.last.mine ? (c.last.read ? "✓✓ " : "✓ ") : ""}${c.last.body}` : "Say hi 👋"}
                    </span>
                    {c.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-good px-1.5 text-[11px] font-bold text-white">{c.unread}</span>}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted">{c.other.score}% match · {c.other.area}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
      <div className={`${onThread ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-col`}>{children}</div>
    </div>
  );
}
