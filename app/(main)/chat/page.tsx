"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, Copy, ExternalLink, Hash, ImageIcon, ListChecks, Loader2, MessagesSquare, Paperclip, Search, SendHorizontal, Trash2, X } from "lucide-react";

interface LastMessage { body: string; created_at: string; mine: boolean }
interface ChatUser { id: string; name: string; role: string; unread: number; last: LastMessage | null }
interface Conversations { general: { id: string; unread: number; last: LastMessage | null }; users: ChatUser[] }
interface Message { id: string; sender_id: string; sender_name: string; body: string; has_image?: boolean; created_at: string }

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const imageUrl = (id: string) => `/api/chat/images/${id}`;
const formatBytes = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

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
  // Telegram-style selection & deletion
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState("");
  const anchorIndex = useRef<number | null>(null);
  // Images: pasted / picked / dropped attachment, and the full-size viewer
  const [pending, setPending] = useState<{ file: File; url: string } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const longPress = useRef<number | null>(null);
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
    setSelecting(false);
    setSelected(new Set());
    setMenu(null);
    setConfirmIds(null);
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

  const canDelete = useCallback(
    (m: Message) => !!me && (m.sender_id === me.userId || me.role === "super_admin"),
    [me]
  );

  const flash = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? "" : t)), 2500);
  };

  const exitSelection = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
    anchorIndex.current = null;
  }, []);

  const startSelection = (id?: string) => {
    setSelecting(true);
    setSelected(new Set(id ? [id] : []));
    anchorIndex.current = id ? messages.findIndex((m) => m.id === id) : null;
    setMenu(null);
  };

  /** Click toggles one message; Shift+click selects the whole range since the last click. */
  const toggleSelect = (index: number, shift: boolean) => {
    const id = messages[index]?.id;
    if (!id) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (shift && anchorIndex.current !== null) {
        const [a, b] = [anchorIndex.current, index].sort((x, y) => x - y);
        for (let i = a; i <= b; i++) next.add(messages[i].id);
      } else if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    anchorIndex.current = index;
  };

  const selectedMessages = useMemo(() => messages.filter((m) => selected.has(m.id)), [messages, selected]);
  const deletableSelected = useMemo(() => selectedMessages.filter(canDelete), [selectedMessages, canDelete]);

  const copyMessages = async (list: Message[]) => {
    const text =
      list.length === 1
        ? list[0].body || "[Image]"
        : list
            .map((m) => `${m.sender_name}, [${new Date(m.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}]\n${m.has_image ? "[Image]" + (m.body ? " " : "") : ""}${m.body}`)
            .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      flash(list.length === 1 ? "Message copied" : `${list.length} messages copied`);
    } catch {
      flash("Couldn't copy to clipboard");
    }
  };

  const deleteMessages = async (ids: string[]) => {
    if (!ids.length) return;
    setDeleting(true);
    setError("");
    const r = await fetch("/api/chat/messages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch(() => null);
    setDeleting(false);
    setConfirmIds(null);
    if (!r?.ok) {
      const j = r ? await r.json().catch(() => null) : null;
      setError(j?.message ?? "Messages could not be deleted.");
      return;
    }
    const { deleted } = (await r.json()) as { deleted: string[] };
    const gone = new Set(deleted);
    setMessages((prev) => prev.filter((m) => !gone.has(m.id)));
    exitSelection();
    flash(deleted.length === 1 ? "Message deleted" : `${deleted.length} messages deleted`);
    void loadConversations();
  };

  // Keyboard: Esc closes menu / leaves selection, Delete deletes, Ctrl+A selects all
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightbox) {
        if (e.key === "Escape") setLightbox(null);
        return;
      }
      if (confirmIds) {
        if (e.key === "Escape") setConfirmIds(null);
        return;
      }
      if (e.key === "Escape") {
        if (menu) setMenu(null);
        else if (selecting) exitSelection();
        return;
      }
      if (!selecting) return;
      const typing = (e.target as HTMLElement)?.tagName === "TEXTAREA" || (e.target as HTMLElement)?.tagName === "INPUT";
      if (typing) return;
      if ((e.key === "Delete" || e.key === "Backspace") && deletableSelected.length) {
        e.preventDefault();
        setConfirmIds(deletableSelected.map((m) => m.id));
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelected(new Set(messages.map((m) => m.id)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, selecting, confirmIds, deletableSelected, messages, exitSelection, lightbox]);

  // Close the context menu on any outside click / scroll / resize
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("resize", close);
    scrollRef.current?.addEventListener("scroll", close);
    const el = scrollRef.current;
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("resize", close);
      el?.removeEventListener("scroll", close);
    };
  }, [menu]);

  const openMenu = (x: number, y: number, id: string) => {
    // keep the menu on-screen
    const w = 190, h = 140;
    setMenu({ x: Math.min(x, window.innerWidth - w - 8), y: Math.min(y, window.innerHeight - h - 8), id });
  };

  /** Stage an image to send (from Ctrl+V, the paperclip, or drag & drop). */
  const attach = useCallback((file: File | null | undefined) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) { setError("Only PNG, JPEG, GIF or WebP images can be sent."); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError(`That image is ${formatBytes(file.size)} — the limit is 10 MB.`); return; }
    setError("");
    setPending((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
    inputRef.current?.focus();
  }, []);

  const clearPending = useCallback(() => {
    setPending((prev) => { if (prev) URL.revokeObjectURL(prev.url); return null; });
  }, []);

  // Ctrl+V anywhere on the chat page (except the people search box) pastes a screenshot
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT") return;
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.kind === "file" && i.type.startsWith("image/"));
      if (!item) return; // plain text paste behaves normally
      e.preventDefault();
      const blob = item.getAsFile();
      if (!blob) return;
      const ext = blob.type.split("/")[1] || "png";
      attach(new File([blob], blob.name && blob.name !== "image.png" ? blob.name : `screenshot.${ext}`, { type: blob.type }));
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [attach]);

  // Drop the staged image when switching conversations
  useEffect(() => { clearPending(); }, [active, clearPending]);

  const send = async () => {
    const body = draft.trim();
    if ((!body && !pending) || sending) return;
    setSending(true);
    setError("");
    const to = activeRef.current;
    let init: RequestInit;
    if (pending) {
      const form = new FormData();
      form.append("to", to);
      form.append("body", body);
      form.append("image", pending.file);
      init = { method: "POST", body: form };
    } else {
      init = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to, body }) };
    }
    const r = await fetch("/api/chat/messages", init).catch(() => null);
    setSending(false);
    if (!r?.ok) {
      const j = r ? await r.json().catch(() => null) : null;
      setError(j?.message ?? "Message could not be sent.");
      return;
    }
    const { message } = (await r.json()) as { message: Message };
    setDraft("");
    clearPending();
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
      <section
        className="relative flex-1 min-w-0 flex flex-col"
        onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragOver(true); } }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false); }}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setDragOver(false);
          attach(e.dataTransfer.files[0]);
        }}
      >
        {dragOver && (
          <div className="pointer-events-none absolute inset-3 z-20 rounded-2xl border-2 border-dashed border-primary/60 bg-primary/[0.08] flex flex-col items-center justify-center gap-2 text-primary">
            <ImageIcon size={28} />
            <p className="text-sm font-medium">Drop image to send</p>
          </div>
        )}
        {selecting ? (
          <header className="h-16 shrink-0 px-4 flex items-center gap-2 border-b border-border bg-primary/[0.06]">
            <button
              onClick={exitSelection}
              className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent"
              title="Cancel (Esc)"
            >
              <X size={17} />
            </button>
            <p className="text-sm font-semibold text-foreground">
              {selectedMessages.length} selected
            </p>
            <button
              onClick={() => setSelected(new Set(messages.map((m) => m.id)))}
              className="ml-2 text-xs text-muted-foreground hover:text-foreground"
              title="Select all (Ctrl+A)"
            >
              Select all
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => void copyMessages(selectedMessages)}
                disabled={!selectedMessages.length}
                className="btn-secondary h-9 px-3 text-xs"
              >
                <Copy size={14} /> Copy
              </button>
              <button
                onClick={() => setConfirmIds(deletableSelected.map((m) => m.id))}
                disabled={!deletableSelected.length}
                className="h-9 px-3 inline-flex items-center gap-2 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                title="Delete (Del)"
              >
                <Trash2 size={14} /> Delete{deletableSelected.length ? ` ${deletableSelected.length}` : ""}
              </button>
            </div>
          </header>
        ) : (
          <header className="h-16 shrink-0 px-6 flex items-center gap-3 border-b border-border">
            <Avatar name={title} general={active === GENERAL} size={34} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{title}</p>
              <p className="text-[11px] text-muted-foreground">{subtitle}</p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => startSelection()}
                className="ml-auto h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Select messages"
              >
                <ListChecks size={15} /> Select
              </button>
            )}
          </header>
        )}

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
                    <div
                      onClick={(e) => { if (selecting) { e.preventDefault(); toggleSelect(i, e.shiftKey); } }}
                      onContextMenu={(e) => { e.preventDefault(); if (!selecting) openMenu(e.clientX, e.clientY, m.id); }}
                      onTouchStart={(e) => {
                        if (selecting) return;
                        const t = e.touches[0];
                        longPress.current = window.setTimeout(() => openMenu(t.clientX, t.clientY, m.id), 450);
                      }}
                      onTouchEnd={() => { if (longPress.current) window.clearTimeout(longPress.current); }}
                      onTouchMove={() => { if (longPress.current) window.clearTimeout(longPress.current); }}
                      className={`relative -mx-3 px-3 rounded-xl flex items-start gap-2.5 transition-colors ${grouped ? "py-0.5" : "pt-2 pb-0.5"} ${
                        selecting ? "cursor-pointer select-none hover:bg-white/[0.03]" : ""
                      } ${selected.has(m.id) ? "bg-primary/[0.09] hover:bg-primary/[0.12]" : ""}`}
                    >
                      {selecting && (
                        <span className="self-center shrink-0 w-6 flex justify-center">
                          {selected.has(m.id) ? (
                            <CheckCircle2 size={20} className="text-primary fill-primary/20" />
                          ) : (
                            <span className="size-[18px] rounded-full border-2 border-muted-foreground/40" />
                          )}
                        </span>
                      )}
                      <div className={`flex-1 min-w-0 flex gap-2.5 ${mine ? "justify-end" : "justify-start"}`}>
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
                          <div
                            className={`text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl overflow-hidden ${
                              m.has_image ? "p-1" : "px-3.5 py-2"
                            } ${
                              menu?.id === m.id ? "ring-2 ring-primary/50" : ""
                            } ${
                              mine
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-secondary text-secondary-foreground ring-1 ring-inset ring-white/[0.06] rounded-bl-md"
                            }`}
                          >
                            {m.has_image && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={imageUrl(m.id)}
                                alt={m.body || "Image"}
                                loading="lazy"
                                draggable={false}
                                onClick={(e) => { if (!selecting) { e.stopPropagation(); setLightbox(m.id); } }}
                                className={`block max-w-[320px] max-h-[320px] w-auto h-auto rounded-xl bg-black/20 object-contain ${selecting ? "" : "cursor-zoom-in"}`}
                              />
                            )}
                            {m.body && <div className={m.has_image ? "px-2.5 pt-1.5 pb-1" : ""}>{m.body}</div>}
                          </div>
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
          {pending && (
            <div className="max-w-3xl mx-auto mb-2 flex items-center gap-3 rounded-xl surface p-2 pr-3 animate-in fade-in-0 slide-in-from-bottom-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pending.url} alt="Image to send" className="size-16 rounded-lg object-cover bg-black/30 ring-1 ring-white/10" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{pending.file.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(pending.file.size)} · add a caption below, then press Enter
                </p>
              </div>
              <button
                onClick={clearPending}
                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent"
                title="Remove image"
              >
                <X size={15} />
              </button>
            </div>
          )}
          <div className="max-w-3xl mx-auto flex items-end gap-2 rounded-xl surface p-2 focus-within:ring-2 focus-within:ring-ring/30">
            <input
              ref={fileRef}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ""; }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="size-9 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Attach image (or paste with Ctrl+V)"
            >
              <Paperclip size={16} />
            </button>
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
              placeholder={pending ? "Add a caption…" : `Message ${active === GENERAL ? "#General" : title}`}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none max-h-40"
            />
            <button
              onClick={() => void send()}
              disabled={(!draft.trim() && !pending) || sending}
              className="btn-primary size-9 p-0 shrink-0"
              title="Send (Enter)"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <SendHorizontal size={15} />}
            </button>
          </div>
          <p className="max-w-3xl mx-auto mt-1.5 px-1 text-[10px] text-muted-foreground/50">
            Enter to send · Shift + Enter for a new line · Ctrl + V to paste a screenshot · Right-click a message for more
          </p>
        </div>
      </section>

      {/* Context menu (right-click / long-press) */}
      {menu && (() => {
        const m = messages.find((x) => x.id === menu.id);
        if (!m) return null;
        return (
          <div
            style={{ left: menu.x, top: menu.y }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-50 w-48 rounded-xl bg-popover p-1 shadow-2xl shadow-black/50 ring-1 ring-white/10 animate-in fade-in-0 zoom-in-95 duration-100"
          >
            <MenuItem icon={<ListChecks size={15} />} label="Select" onClick={() => startSelection(m.id)} />
            <MenuItem icon={<Copy size={15} />} label="Copy text" onClick={() => { setMenu(null); void copyMessages([m]); }} />
            {canDelete(m) && (
              <>
                <div className="my-1 h-px bg-border" />
                <MenuItem danger icon={<Trash2 size={15} />} label="Delete" onClick={() => { setMenu(null); setConfirmIds([m.id]); }} />
              </>
            )}
          </div>
        );
      })()}

      {/* Delete confirmation */}
      {confirmIds && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 animate-in fade-in-0 duration-150"
          onClick={() => !deleting && setConfirmIds(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl surface p-6 animate-in zoom-in-95 duration-150"
          >
            <div className="size-11 rounded-full bg-red-500/12 ring-1 ring-red-500/25 flex items-center justify-center text-red-400 mb-4">
              <Trash2 size={18} />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Delete {confirmIds.length === 1 ? "message" : `${confirmIds.length} messages`}?
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {confirmIds.length === 1 ? "It" : "They"}’ll be removed for everyone in this chat. This can’t be undone.
            </p>
            {selecting && selectedMessages.length > deletableSelected.length && (
              <p className="mt-3 text-xs text-muted-foreground bg-white/[0.04] rounded-lg px-3 py-2">
                {selectedMessages.length - deletableSelected.length} selected message
                {selectedMessages.length - deletableSelected.length === 1 ? " was" : "s were"} sent by someone else and will be kept.
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setConfirmIds(null)} disabled={deleting} className="btn-secondary h-9">
                Cancel
              </button>
              <button
                onClick={() => void deleteMessages(confirmIds)}
                disabled={deleting}
                autoFocus
                className="h-9 px-4 inline-flex items-center gap-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-size image viewer */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-6 animate-in fade-in-0 duration-150"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl(lightbox)}
            alt="Full size"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-150"
          />
          <div className="absolute top-4 right-4 flex gap-2">
            <a
              href={imageUrl(lightbox)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="size-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              title="Open in new tab"
            >
              <ExternalLink size={17} />
            </a>
            <button
              onClick={() => setLightbox(null)}
              className="size-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-popover px-4 py-2 text-sm text-foreground shadow-xl ring-1 ring-white/10 animate-in fade-in-0 slide-in-from-bottom-2">
          <Check size={14} className="text-emerald-400" /> {toast}
        </div>
      )}
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

function MenuItem({ icon, label, onClick, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
        danger ? "text-red-400 hover:bg-red-500/12" : "text-foreground hover:bg-accent"
      }`}
    >
      <span className={danger ? "" : "text-muted-foreground"}>{icon}</span>
      {label}
    </button>
  );
}
