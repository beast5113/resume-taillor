"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Hash, Loader2, MessagesSquare, Search, SendHorizontal, Trash2, X } from "lucide-react";

interface LastMessage { body: string; created_at: string; mine: boolean }
interface ChatUser { id: string; name: string; role: string; unread: number; last: LastMessage | null }
interface Conversations { general: { id: string; unread: number; last: LastMessage | null }; users: ChatUser[] }
interface Message { id: string; sender_id: string; sender_name: string; body: string; created_at: string }

const GENERAL = "general";
const MESSAGE_POLL_MS = 3000;
const LIST_POLL_MS = 8000;

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function roleLabel(role: string) {
  return role === "super_admin" ? "Super admin" : role === "admin" ? "Admin" : "Assistant";
}

function shortTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function Avatar({ name, size = 36, general = false }: { name: string; size?: number; general?: boolean }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-full flex items-center justify-center text-[12px] font-semibold text-white ${
        general ? "bg-linear-to-br from-sky-500 to-cyan-400" : "bg-linear-to-br from-slate-600 to-slate-700 ring-1 ring-white/10"
      }`}
    >
      {general ? <Hash size={size * 0.45} /> : initials(name)}
    </div>
  );
}

export default function ChatPage() {
  const [me, setMe] = useState<{ userId: string; name: string; role: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [convs, setConvs] = useState<Conversations | null>(null);
  const [active, setActive] = useState<string>(GENERAL);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const activeRef = useRef(active);
  activeRef.current = active;

  // Who am I
  useEffect(() => {
    fetch("/api/me").then((r) => (r.ok ? r.json() : null)).then((d) => d && setMe({ userId: d.userId, name: d.name, role: d.role }));
  }, []);

  // Conversation list (+ unread), polled
  const loadConversations = useCallback(async () => {
    const r = await fetch("/api/chat/conversations");
    if (r.ok) {
      const data: Conversations = await r.json();
      setConvs(data);
      // Keep the sidebar badge in sync instantly (it also polls on its own).
      const total = data.general.unread + data.users.reduce((n, u) => n + u.unread, 0);
      window.dispatchEvent(new CustomEvent("hexninja:chat-unread", { detail: total }));
    }
    else if (r.status === 500) setError("Chat isn't set up yet — run migrations/002_chat.sql in Supabase.");
  }, []);
  useEffect(() => {
    void loadConversations();
    const t = window.setInterval(() => void loadConversations(), LIST_POLL_MS);
    return () => window.clearInterval(t);
  }, [loadConversations]);

  // Open a conversation, then keep it fresh. Each poll reloads the latest
  // messages (not just newer ones) so deletions disappear for everyone too.
  useEffect(() => {
    let cancelled = false;
    let signature = "";
    setMessages([]);
    setLoadingMessages(true);
    setConfirmId(null);
    stickToBottom.current = true;

    const load = async (initial: boolean) => {
      const r = await fetch(`/api/chat/messages?with=${encodeURIComponent(active)}`).catch(() => null);
      if (cancelled || !r?.ok) { if (initial) setLoadingMessages(false); return; }
      const { messages: rows } = (await r.json()) as { messages: Message[] };
      if (cancelled) return;
      const next = rows.map((m) => m.id).join(",");
      if (initial || next !== signature) {
        setMessages(rows);
        if (!initial) void loadConversations();
      }
      signature = next;
      if (initial) setLoadingMessages(false);
    };

    void load(true).then(() => void loadConversations());
    const t = window.setInterval(() => void load(false), MESSAGE_POLL_MS);
    inputRef.current?.focus();
    return () => { cancelled = true; window.clearInterval(t); };
  }, [active, loadConversations]);

  // Keep the view pinned to the newest message unless the user scrolled up
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const canDelete = (m: Message) => !!me && (m.sender_id === me.userId || me.role === "super_admin");

  const removeMessage = async (id: string) => {
    setDeletingId(id);
    setError("");
    const r = await fetch(`/api/chat/messages/${id}`, { method: "DELETE" }).catch(() => null);
    setDeletingId(null);
    setConfirmId(null);
    if (!r || (!r.ok && r.status !== 404)) {
      const j = r ? await r.json().catch(() => null) : null;
      setError(j?.message ?? "Message could not be deleted.");
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
    void loadConversations();
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    const to = activeRef.current;
    const r = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, body }),
    }).catch(() => null);
    setSending(false);
    if (!r?.ok) {
      const j = r ? await r.json().catch(() => null) : null;
      setError(j?.message ?? "Message could not be sent.");
      return;
    }
    const { message } = (await r.json()) as { message: Message };
    setDraft("");
    stickToBottom.current = true;
    if (activeRef.current === to) setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    void loadConversations();
    inputRef.current?.focus();
  };

  // Auto-grow the composer
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  const users = useMemo(() => {
    const list = convs?.users ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q ? list.filter((u) => u.name.toLowerCase().includes(q)) : list;
    // Recent conversations first, then alphabetical
    return [...filtered].sort((a, b) => {
      const ta = a.last ? Date.parse(a.last.created_at) : 0;
      const tb = b.last ? Date.parse(b.last.created_at) : 0;
      return tb - ta || a.name.localeCompare(b.name);
    });
  }, [convs, search]);

  const activeUser = convs?.users.find((u) => u.id === active) ?? null;
  const title = active === GENERAL ? "General" : activeUser?.name ?? "Conversation";
  const subtitle = active === GENERAL ? "Everyone on the team" : activeUser ? roleLabel(activeUser.role) : "";

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Conversation list ─────────────────────────────────────── */}
      <aside className="w-72 shrink-0 border-r border-border flex flex-col bg-card/40">
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-lg text-foreground flex items-center gap-2">
            <MessagesSquare size={18} className="text-primary" /> Chat
          </h1>
          <div className="relative mt-4">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people"
              className="field-input h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {convs && !search && (
            <ConversationRow
              selected={active === GENERAL}
              onClick={() => setActive(GENERAL)}
              avatar={<Avatar name="General" general />}
              name="General"
              preview={convs.general.last ? `${convs.general.last.mine ? "You: " : ""}${convs.general.last.body}` : "Team-wide channel"}
              time={convs.general.last?.created_at}
              unread={convs.general.unread}
            />
          )}
          {convs && users.length > 0 && (
            <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
              Direct messages
            </p>
          )}
          {users.map((u) => (
            <ConversationRow
              key={u.id}
              selected={active === u.id}
              onClick={() => setActive(u.id)}
              avatar={<Avatar name={u.name} />}
              name={u.name}
              tag={roleLabel(u.role)}
              preview={u.last ? `${u.last.mine ? "You: " : ""}${u.last.body}` : "Start a conversation"}
              time={u.last?.created_at}
              unread={u.unread}
            />
          ))}
          {!convs && (
            <div className="flex justify-center py-10 text-muted-foreground"><Loader2 size={16} className="animate-spin" /></div>
          )}
          {convs && search && users.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No one matches “{search}”.</p>
          )}
        </div>
      </aside>

      {/* ── Thread ────────────────────────────────────────────────── */}
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 px-6 flex items-center gap-3 border-b border-border">
          <Avatar name={title} general={active === GENERAL} size={34} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{title}</p>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </header>

        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-6 py-5">
          {loadingMessages ? (
            <div className="h-full flex items-center justify-center text-muted-foreground"><Loader2 size={18} className="animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2">
              <div className="size-12 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary">
                <MessagesSquare size={20} />
              </div>
              <p className="text-sm font-medium text-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {active === GENERAL ? "Say hello to the whole team." : `Send ${title} the first message.`}
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-1">
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const mine = m.sender_id === me?.userId;
                const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
                const grouped =
                  !newDay && prev && prev.sender_id === m.sender_id &&
                  Date.parse(m.created_at) - Date.parse(prev.created_at) < 5 * 60 * 1000;
                return (
                  <div key={m.id}>
                    {newDay && (
                      <div className="flex items-center gap-3 py-4">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-[11px] font-medium text-muted-foreground">{dayLabel(m.created_at)}</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    <div className={`flex gap-2.5 ${mine ? "justify-end" : "justify-start"} ${grouped ? "" : "pt-2"}`}>
                      {!mine && (
                        <div className="w-8 shrink-0">{!grouped && <Avatar name={m.sender_name} size={32} />}</div>
                      )}
                      <div className={`max-w-[72%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                        {!grouped && (
                          <p className="mb-1 px-1 text-[11px] text-muted-foreground">
                            {!mine && <span className="font-medium text-foreground/80 mr-1.5">{m.sender_name}</span>}
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                        <div className={`group/msg flex items-center gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
                          <div
                            className={`px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl transition-opacity ${
                              deletingId === m.id ? "opacity-40" : ""
                            } ${
                              mine
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-secondary text-secondary-foreground ring-1 ring-inset ring-white/[0.06] rounded-bl-md"
                            }`}
                          >
                            {m.body}
                          </div>
                          {canDelete(m) && (
                            confirmId === m.id ? (
                              <div className="shrink-0 flex items-center gap-1 rounded-lg bg-popover ring-1 ring-white/10 p-0.5 shadow-lg">
                                <span className="px-1.5 text-[11px] text-muted-foreground">Delete?</span>
                                <button
                                  onClick={() => void removeMessage(m.id)}
                                  disabled={deletingId === m.id}
                                  className="size-6 rounded-md flex items-center justify-center text-red-400 hover:bg-red-500/15 disabled:opacity-50"
                                  title="Delete message"
                                >
                                  {deletingId === m.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                                </button>
                                <button
                                  onClick={() => setConfirmId(null)}
                                  className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
                                  title="Cancel"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmId(m.id)}
                                className="shrink-0 size-7 rounded-md flex items-center justify-center text-muted-foreground/60 opacity-0 group-hover/msg:opacity-100 focus-visible:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title={mine ? "Delete message" : "Delete message (super admin)"}
                              >
                                <Trash2 size={13} />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 px-6 pb-5 pt-2">
          {error && <p className="max-w-3xl mx-auto mb-2 text-xs text-destructive bg-destructive/10 ring-1 ring-inset ring-destructive/25 px-3 py-2 rounded-lg">{error}</p>}
          <div className="max-w-3xl mx-auto flex items-end gap-2 rounded-xl surface p-2 focus-within:ring-2 focus-within:ring-ring/30">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={4000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={`Message ${active === GENERAL ? "#General" : title}`}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none max-h-40"
            />
            <button
              onClick={() => void send()}
              disabled={!draft.trim() || sending}
              className="btn-primary size-9 p-0 shrink-0"
              title="Send (Enter)"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <SendHorizontal size={15} />}
            </button>
          </div>
          <p className="max-w-3xl mx-auto mt-1.5 px-1 text-[10px] text-muted-foreground/50">
            Enter to send · Shift + Enter for a new line
          </p>
        </div>
      </section>
    </div>
  );
}

function ConversationRow({
  selected, onClick, avatar, name, tag, preview, time, unread,
}: {
  selected: boolean; onClick: () => void; avatar: React.ReactNode; name: string;
  tag?: string; preview: string; time?: string; unread: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
        selected ? "bg-white/[0.07] ring-1 ring-inset ring-white/[0.08]" : "hover:bg-accent"
      }`}
    >
      {avatar}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`truncate text-[13px] ${unread ? "font-semibold text-foreground" : "font-medium text-foreground/90"}`}>{name}</span>
          {tag && <span className="shrink-0 text-[9px] uppercase tracking-wide text-muted-foreground/60">{tag}</span>}
          {time && <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/70">{shortTime(time)}</span>}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className={`truncate text-xs ${unread ? "text-foreground/80" : "text-muted-foreground"}`}>{preview}</span>
          {unread > 0 && (
            <span className="ml-auto shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-[10px] font-semibold text-white flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
