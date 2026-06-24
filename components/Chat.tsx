"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "Who's winning the whole thing, and don't hedge.",
  "Roast my takes so far.",
  "What have I been wrong about?",
  "Argentina vs Brazil in the final — who lifts it?",
];

export default function Chat({
  handle,
  hasModel,
  onActivity,
}: {
  handle: string;
  hasModel: boolean;
  onActivity: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Right then. I'm GAFFER — I remember every take you give me, and I keep the receipts. Give me a prediction or tell me what you reckon, and I'll hold you to it all tournament.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle, messages: next }),
      });

      if (!res.body) {
        const t = await res.text();
        setMessages((m) => patchLast(m, t));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => patchLast(m, acc));
      }
    } catch {
      setMessages((m) => patchLast(m, "⚠️ Lost the connection to the gaffer. Try again."));
    } finally {
      setBusy(false);
      // Chat messages may have been captured to Walrus — refresh the record.
      setTimeout(onActivity, 3500);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-bold">Talk to GAFFER</h2>
        <span className="text-xs text-[var(--muted)]">remembers · recalls · roasts</span>
      </div>

      <div ref={scrollRef} className="min-h-[260px] flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} thinking={busy && i === messages.length - 1 && !m.content} />
        ))}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {STARTERS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={!hasModel}
              className="rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--lime)] hover:text-white disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-[var(--border)] p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          disabled={!hasModel}
          placeholder={hasModel ? "Make a call, or ask what you've said before…" : "Add GLM_API_KEY to chat"}
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--lime)] disabled:opacity-50"
        />
        <button
          onClick={() => send(input)}
          disabled={busy || !input.trim() || !hasModel}
          className="rounded-xl bg-[var(--lime)] px-4 py-2.5 text-sm font-bold text-black transition enabled:hover:brightness-95 disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </section>
  );
}

function patchLast(m: Msg[], content: string): Msg[] {
  const copy = [...m];
  copy[copy.length - 1] = { role: "assistant", content };
  return copy;
}

function Bubble({
  role,
  content,
  thinking,
}: {
  role: "user" | "assistant";
  content: string;
  thinking?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-[var(--blue)] text-white"
            : "border border-[var(--border)] bg-[var(--panel-2)]"
        }`}
      >
        {thinking ? (
          <span className="inline-flex gap-1">
            <span className="dot">●</span>
            <span className="dot">●</span>
            <span className="dot">●</span>
          </span>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
