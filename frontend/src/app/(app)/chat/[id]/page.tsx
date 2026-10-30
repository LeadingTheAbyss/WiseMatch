"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Send, Sparkles } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { clock } from "@/lib/format";
import type { Msg } from "@/lib/types";
import { Avatar, Spinner } from "@/components/ui";

interface Thread {
  other: { id: number; name: string; area: string; verified: boolean; last_active: string; is_demo: boolean; score: number; occupation: string; avatar: string };
  status: "accepted" | "request";
  incoming: boolean;
  outgoing: boolean;
  messages: Msg[];
}

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [other, setOther] = useState<Thread["other"] | null>(null);
  const [flags, setFlags] = useState({ incoming: false, outgoing: false });
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const last = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  const typingUntil = useRef(0);

  const poll = useCallback(async () => {
    try {
      const r = await api<Thread>(`/conversations/${id}/messages?after=${last.current}`);
      setOther(r.other);
      setFlags({ incoming: r.incoming, outgoing: r.outgoing });
      if (r.messages.length) {
        last.current = r.messages[r.messages.length - 1].id;
        setMsgs((p) => {
          const seen = new Set(p.map((m) => m.id));
          return [...p, ...r.messages.filter((m) => !seen.has(m.id))];
        });
        if (r.messages.some((m) => !m.mine)) {
          typingUntil.current = 0;
          setTyping(false);
          setMsgs((p) => p.map((m) => (m.mine ? { ...m, read: true } : m)));
        }
      }
    } catch {
      setError("Couldn't load this chat.");
    }
  }, [id]);

  useEffect(() => {
    setMsgs([]);
    setIdeas([]);
    setError("");
    setNotice("");
    last.current = 0;
    void poll();
    const draft = new URLSearchParams(window.location.search).get("draft");
    if (draft) setText(draft);
    const t = setInterval(() => {
      void poll();
      if (typingUntil.current && Date.now() > typingUntil.current) {
        typingUntil.current = 0;
        setTyping(false);
      }
    }, 1800);
    return () => clearInterval(t);
  }, [id, poll]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length, typing]);

  useEffect(() => {
    if (!other || flags.incoming || flags.outgoing || msgs.length > 4) return;
    api<{ icebreakers: string[] }>(`/users/${other.id}/explain`, { method: "POST" })
      .then((r) => setIdeas(r.icebreakers))
      .catch(() => {});
  }, [other?.id, flags.incoming, flags.outgoing]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(body: string) {
    const clean = body.trim();
    if (!clean || sending) return;
    setSending(true);
    setText("");
    try {
      const m = await api<Msg>(`/conversations/${id}/messages`, { method: "POST", body: { body: clean } });
      last.current = Math.max(last.current, m.id);
      setMsgs((p) => [...p, m]);
      if (flags.incoming) setFlags({ incoming: false, outgoing: false }); // replying accepts the request
      if (other?.is_demo && !flags.outgoing) {
        setTyping(true);
        typingUntil.current = Date.now() + 12000;
      }
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : "Message failed to send.");
      setText(clean);
    } finally {
      setSending(false);
    }
  }

  async function accept() {
    await api(`/conversations/${id}/accept`, { method: "POST" });
    setFlags({ incoming: false, outgoing: false });
  }
  async function decline() {
    await api(`/conversations/${id}`, { method: "DELETE" });
    router.push("/chat");
  }

  if (error && !other) return <div className="grid h-full place-items-center text-sm text-muted">{error}</div>;

  const first = other?.name.split(" ")[0] ?? "";
  const locked = flags.outgoing;

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line px-3 py-3 sm:px-4">
        <Link href="/chat" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface2 lg:hidden" aria-label="Back"><ArrowLeft size={18} /></Link>
        {other ? (
          <>
            <Link href={`/profile/${other.id}`}><Avatar name={other.name} id={other.id} size={42} src={other.avatar} /></Link>
            <div className="min-w-0 flex-1">
              <Link href={`/profile/${other.id}`} className="flex items-center gap-1 truncate text-sm font-semibold hover:underline">
                {other.name} {other.verified && <BadgeCheck size={13} className="text-sky-500" />}
              </Link>
              <div className="truncate text-xs text-good">{typing ? "typing…" : other.last_active}</div>
            </div>
            <Link href={`/profile/${other.id}`} className="chip hidden sm:inline-flex">{other.score}% match</Link>
          </>
        ) : (
          <Spinner />
        )}
      </header>

      {flags.incoming && other && (
        <div className="border-b border-brand/30 bg-brand/5 px-4 py-3">
          <p className="text-sm"><b>{first}</b> wants to message you. They won&apos;t see that you&apos;ve read this until you accept.</p>
          <div className="mt-2.5 flex gap-2">
            <button className="btn-primary !py-2" onClick={accept}>Accept</button>
            <button className="btn-ghost !py-2" onClick={decline}>Delete</button>
          </div>
        </div>
      )}
      {locked && other && (
        <div className="border-b border-line bg-surface2 px-4 py-2.5 text-sm text-muted">
          Request sent. You can keep chatting once {first} accepts.
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-4 sm:px-5" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(109,40,217,0.07) 1px, transparent 0)", backgroundSize: "22px 22px" }}>
        {msgs.map((m, i) => {
          const prev = msgs[i - 1];
          const newGroup = !prev || prev.mine !== m.mine;
          return (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"} ${newGroup ? "pt-2" : ""}`}>
              <div className={`anim-in max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed sm:max-w-[70%] ${m.mine ? "rounded-br-md text-white" : "rounded-bl-md border border-line bg-white"}`} style={m.mine ? { backgroundImage: "linear-gradient(135deg,#6d28d9,#8b5cf6)" } : undefined}>
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${m.mine ? "text-white/75" : "text-muted"}`}>
                  {clock(m.at)} {m.mine && <span>{m.read ? "✓✓" : "✓"}</span>}
                </div>
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="flex justify-start pt-2">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-white px-4 py-3">
              {[0, 1, 2].map((i) => <span key={i} className="dot-pulse h-1.5 w-1.5 rounded-full bg-muted" style={{ animationDelay: `${i * 0.18}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <div className="border-t border-line p-3">
        {notice && <p className="mb-2 text-xs text-rose-600">{notice}</p>}
        {ideas.length > 0 && msgs.length <= 4 && !locked && (
          <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
            <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted"><Sparkles size={12} /> Ideas</span>
            {ideas.map((t) => (
              <button key={t} onClick={() => setText(t)} className="shrink-0 rounded-full border border-line bg-surface2 px-3 py-1.5 text-xs transition hover:border-brand/60">{t.length > 46 ? t.slice(0, 44) + "…" : t}</button>
            ))}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); void send(text); }} className="flex items-center gap-2">
          <input className="input !rounded-full !py-3" placeholder={locked ? `Waiting for ${first} to accept…` : "Type a message"} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} disabled={locked} />
          <button type="submit" className="btn-primary !h-11 !w-11 shrink-0 !rounded-full !p-0" disabled={!text.trim() || sending || locked} aria-label="Send">
            {sending ? <Spinner size={16} /> : <Send size={17} />}
          </button>
        </form>
      </div>
    </>
  );
}
