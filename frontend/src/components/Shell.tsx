"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Search, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Avatar, Logo } from "./ui";

const NAV = [
  { href: "/discover", label: "Search", Icon: Search },
  { href: "/chat", label: "Chat", Icon: MessageCircle },
  { href: "/me", label: "Profile", Icon: UserRound },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me, refresh } = useAuth();

  useEffect(() => {
    const t = setInterval(() => void refresh(), 8000);
    return () => clearInterval(t);
  }, [refresh]);

  const unread = me?.counts.unread ?? 0;
  const badge = (href: string) => (href === "/chat" && unread > 0 ? unread : 0);

  return (
    <div className="flex min-h-dvh">
      {/* desktop icon rail */}
      <aside className="sticky top-0 hidden h-dvh w-[88px] shrink-0 flex-col items-center border-r border-line bg-white py-5 lg:flex">
        <Link href="/discover" className="text-3xl leading-none" aria-label="WiseMatch">🏠</Link>
        <nav className="mt-8 grid w-full gap-1 px-2">
          {NAV.map(({ href, label, Icon }) => {
            const on = pathname.startsWith(href);
            const b = badge(href);
            return (
              <Link key={href} href={href} className={`relative flex flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-semibold transition ${on ? "bg-brand/10 text-brand" : "text-muted hover:bg-surface2 hover:text-ink"}`}>
                <Icon size={21} />
                {label}
                {b > 0 && <span className="absolute right-2.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{b}</span>}
              </Link>
            );
          })}
        </nav>
        {me && (
          <Link href="/me" className="mt-auto" aria-label="Your profile">
            <Avatar name={me.name} id={me.id} size={40} src={me.avatar} />
          </Link>
        )}
      </aside>

      <div className="min-w-0 flex-1">
        {/* mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/discover"><Logo size={22} /></Link>
          {me && <Link href="/me"><Avatar name={me.name} id={me.id} size={32} src={me.avatar} /></Link>}
        </header>
        <div className="px-3 pb-28 pt-4 sm:px-5 lg:px-6 lg:pb-10 lg:pt-5">{children}</div>
      </div>

      {/* mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {NAV.map(({ href, label, Icon }) => {
            const on = pathname.startsWith(href);
            const b = badge(href);
            return (
              <Link key={href} href={href} className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${on ? "text-brand" : "text-muted"}`}>
                <span className={`relative grid h-8 w-14 place-items-center rounded-full transition ${on ? "bg-brand/10" : ""}`}>
                  <Icon size={21} />
                  {b > 0 && <span className="absolute right-2 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{b}</span>}
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
