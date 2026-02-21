import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { buildUserContext } from "../services/userContext";
import { sendCoachChat, type ChatMsg } from "../services/coachChat";

const SUGGESTIONS = [
  "How can I improve my free throw consistency?",
  "Give me a 20-minute workout for my weakest area.",
  "What should I focus on after my last game?",
  "How do I fix my shooting form step by step?",
];

function chatKey(userId: string) {
  return `coach_chat_${userId}`;
}

export default function CoachChatView({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(chatKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMsg[];
        if (Array.isArray(parsed)) setMessages(parsed.slice(-50));
      }
    } catch {}
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    localStorage.setItem(chatKey(userId), JSON.stringify(messages.slice(-50)));
  }, [messages, userId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const canSend = !!userId && input.trim().length > 0 && !loading;

  async function handleSend(text: string) {
    if (!userId) return;
    const t = text.trim();
    if (!t || loading) return;

    const next: ChatMsg[] = [...messages, { role: "user" as const, text: t }].slice(-50);
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const context = await buildUserContext(userId);
      const reply = await sendCoachChat(next.slice(-12), context);
      setMessages((prev) => [...prev, { role: "model" as const, text: reply }].slice(-50));
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "model" as const, text: "I had trouble responding. Please try again." },
      ].slice(-50));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && canSend) {
      handleSend(input);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] bg-background flex flex-col">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            
            <div className="text-lg font-extrabold text-white leading-tight">Bryce, your AI Coach</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 text-white/80 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {messages.length === 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSend(s)}
                disabled={loading}
                className="shrink-0 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-extrabold text-white/80 active:scale-95 transition-transform"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-3">
        {messages.length === 0 && (
          <div className="rounded-3xl bg-surface border border-white/5 p-5 text-white/60 text-sm font-semibold leading-relaxed">
            Ask me anything about your training, games, or shooting form. Use the suggestions above to get started.
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={[
                "max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed border",
                m.role === "user"
                  ? "bg-primary text-black border-primary/30 font-semibold"
                  : "bg-surface text-white/85 border-white/10 font-semibold",
              ].join(" ")}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-3xl px-4 py-4 text-sm border bg-surface border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/30 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-white/30 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-white/30 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-6 pb-8 pt-4 border-t border-white/5 bg-background">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach..."
            className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-4 py-4 text-sm font-semibold text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
          <button
            type="button"
            onClick={() => handleSend(input)}
            disabled={!canSend}
            className={[
              "rounded-2xl px-5 py-4 text-sm font-extrabold transition-all",
              canSend
                ? "bg-primary text-black active:scale-95"
                : "bg-white/10 text-white/30 cursor-not-allowed",
            ].join(" ")}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
