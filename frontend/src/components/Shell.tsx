"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Search, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar, Logo } from "./ui";

const NAV = [
  { href: "/discover", label: "Discover", Icon: Search },
  { href: "/chat", label: "Chat", Icon: MessageCircle },
  { href: "/me", label: "Profile", Icon: UserRound },
];

interface Health {
  qloo: string;
  llm: string;
  db: string;
  users: number;
}

function StatusPills({ h }: { h: Health | null }) {
  if (!h) return null;
  const live = h.qloo === "live";
  return (
    <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
      <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${live ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/25 bg-amber-500/10 text-amber-300"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-400" : "bg-amber-400"}`} /> Qloo {live ? "live" : "offline graph"}
      </span>
      <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${h.llm === "groq" ? "border-sky-500/30 bg-sky-500/10 text-sky-300" : "border-zinc-500/30 text-zinc-400"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${h.llm === "groq" ? "bg-sky-400" : "bg-zinc-500"}`} /> AI {h.llm === "groq" ? "on" : "off"}
      </span>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me, refresh } = useAuth();
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    api<Health>("/health", { auth: false }).then(setHealth).catch(() => {});
    const t = setInterval(() => void refresh(), 8000);
    return () => clearInterval(t);
  }, [refresh]);

  const unread = me?.counts.unread ?? 0;
  const badge = (href: string) => (href === "/chat" && unread > 0 ? unread : 0);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1400px]">
      {/* desktop rail */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line px-4 py-5 lg:flex">
        <Link href="/discover"><Logo /></Link>
        <nav className="mt-8 grid gap-1">
          {NAV.map(({ href, label, Icon }) => {
            const on = pathname.startsWith(href);
            const b = badge(href);
            return (
              <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${on ? "bg-brand/15 text-white" : "text-muted hover:bg-surface2 hover:text-ink"}`}>
                <Icon size={18} className={on ? "text-violet-300" : ""} /> {label}
                {b > 0 && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-brand2 px-1.5 text-[11px] font-bold text-white">{b}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3">
          <StatusPills h={health} />
          {me && (
            <Link href="/me" className="card flex items-center gap-3 p-2.5 transition hover:border-brand/50">
              <Avatar name={me.name} id={me.id} size={36} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{me.name}</div>
                <div className="truncate text-xs text-muted">{me.area}</div>
              </div>
            </Link>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/85 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/discover"><Logo size={24} /></Link>
          <StatusPills h={health} />
        </header>
        <div className="px-3 pb-28 pt-4 sm:px-6 lg:pb-10 lg:pt-6">{children}</div>
      </div>

      {/* mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {NAV.map(({ href, label, Icon }) => {
            const on = pathname.startsWith(href);
            const b = badge(href);
            return (
              <Link key={href} href={href} className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${on ? "text-white" : "text-muted"}`}>
                <span className={`relative grid h-8 w-14 place-items-center rounded-full transition ${on ? "bg-brand/20" : ""}`}>
                  <Icon size={21} className={on ? "text-violet-300" : ""} />
                  {b > 0 && <span className="absolute right-2 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-brand2 px-1 text-[10px] font-bold text-white">{b}</span>}
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
