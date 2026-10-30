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

type Tab = "chats" | "requests";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { refresh } = useAuth();
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("chats");
  const onThread = pathname !== "/chat";
  const activeId = onThread ? Number(pathname.split("/")[2]) : null;

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "requests") setTab("requests");
  }, []);

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

  // opening a thread switches to the tab it belongs to
  useEffect(() => {
    if (!items || activeId == null) return;
    const open = items.find((c) => c.id === activeId);
    if (open) setTab(open.incoming ? "requests" : "chats");
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const incoming = (items ?? []).filter((c) => c.incoming);
  const chats = (items ?? []).filter((c) => !c.incoming);
  const list = (tab === "requests" ? incoming : chats).filter((c) => c.other.name.toLowerCase().includes(q.toLowerCase()));
  const newRequests = incoming.reduce((n, c) => n + (c.unread > 0 ? 1 : 0), 0) || incoming.length;

  return (
    <div className="card grid h-[calc(100dvh-9.5rem)] overflow-hidden lg:h-[calc(100dvh-3rem)] lg:grid-cols-[360px_1fr]">
      <div className={`${onThread ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r border-line`}>
        <div className="border-b border-line p-4 pb-0">
          <h1 className="font-display text-xl font-bold">Messages</h1>
          <div className="relative mt-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input !py-2 !pl-9" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="mt-3 grid grid-cols-2">
            {([["chats", "Chats"], ["requests", "Requests"]] as [Tab, string][]).map(([k, label]) => {
              const on = tab === k;
              const count = k === "requests" ? newRequests : 0;
              return (
                <button key={k} onClick={() => setTab(k)} className={`flex items-center justify-center gap-2 border-b-2 py-2.5 text-sm font-semibold transition ${on ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}>
                  {label}
                  {count > 0 && (
                    <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold text-white ${on ? "bg-brand" : "animate-pulse bg-rose-500"}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {items === null ? (
            <div className="space-y-3 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : list.length === 0 ? (
            tab === "requests" ? (
              <EmptyState icon="📨" title="No message requests" body="When someone wants to talk to you, their request shows up here." />
            ) : (
              <EmptyState icon="💬" title="No chats yet" body="Find someone on Search and send them a message request." />
            )
          ) : (
            list.map((c) => (
              <Link key={c.id} href={`/chat/${c.id}`} className={`flex items-center gap-3 border-b border-line/60 px-4 py-3 transition hover:bg-surface2 ${activeId === c.id ? "bg-surface2" : ""} ${c.incoming ? "border-l-4 border-l-brand bg-brand/5" : ""}`}>
                <Avatar name={c.other.name} id={c.other.id} size={50} src={c.other.avatar} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1 truncate text-sm font-semibold">
                      <span className="truncate">{c.other.name}</span>
                      {c.other.verified && <BadgeCheck size={13} className="shrink-0 text-sky-500" />}
                    </span>
                    <span className={`shrink-0 text-[11px] ${c.unread ? "font-semibold text-brand" : "text-muted"}`}>{c.last ? timeAgo(c.last.at) : ""}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className={`truncate text-[13px] ${c.unread ? "font-medium text-ink" : "text-muted"}`}>
                      {c.last ? `${c.last.mine ? "You: " : ""}${c.last.body}` : "Say hi 👋"}
                    </span>
                    {c.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">{c.unread}</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                    <span>{c.other.score}% match · {c.other.area}</span>
                    {c.incoming && <span className="rounded bg-brand px-1.5 py-0.5 font-semibold text-white">New request</span>}
                    {c.outgoing && <span className="rounded bg-surface2 px-1.5 py-0.5 font-semibold text-muted">Request sent</span>}
                  </div>
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
