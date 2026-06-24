"use client";

import { useState, useTransition } from "react";
import { logTake, type Receipt } from "@/app/actions";
import type { TakeKind } from "@/lib/gaffer";

const KINDS: { kind: TakeKind; label: string; hint: string; emoji: string }[] = [
  { kind: "prediction", label: "Prediction", hint: "Brazil win it. Mbappé golden boot. England bottle the QF.", emoji: "🔮" },
  { kind: "opinion", label: "Opinion", hint: "Modrić is still the most elegant midfielder alive.", emoji: "💬" },
  { kind: "reaction", label: "Reaction", hint: "I CALLED IT. Told you they'd choke.", emoji: "🔥" },
];

export default function Composer({
  handle,
  onLogged,
}: {
  handle: string;
  onLogged: (r: Receipt) => void;
}) {
  const [kind, setKind] = useState<TakeKind>("prediction");
  const [text, setText] = useState("");
  const [fixture, setFixture] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const active = KINDS.find((k) => k.kind === kind)!;

  function submit() {
    if (!text.trim() || pending) return;
    setError(null);
    start(async () => {
      const res = await logTake(handle, kind, text, fixture);
      if (res.ok) {
        onLogged(res.receipt);
        setText("");
        setFixture("");
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">Put a take on the record</h2>
        <span className="text-xs text-[var(--muted)]">→ stored on Walrus, forever</span>
      </div>

      <div className="mb-3 flex gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            onClick={() => setKind(k.kind)}
            className={`flex-1 rounded-lg border px-2 py-1.5 text-sm font-semibold transition ${
              kind === k.kind
                ? "border-[var(--lime)] bg-[var(--lime)] text-black"
                : "border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)] hover:text-white"
            }`}
          >
            <span className="mr-1">{k.emoji}</span>
            {k.label}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        rows={2}
        placeholder={active.hint}
        className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--lime)]"
      />

      <div className="mt-2 flex items-center gap-2">
        <input
          value={fixture}
          onChange={(e) => setFixture(e.target.value)}
          placeholder="fixture (optional) e.g. BRA v CRO"
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-xs outline-none focus:border-[var(--lime)]"
        />
        <button
          onClick={submit}
          disabled={pending || !text.trim()}
          className="rounded-lg bg-[var(--lime)] px-4 py-2 text-sm font-bold text-black transition enabled:hover:brightness-95 disabled:opacity-40"
        >
          {pending ? "Saving…" : "Log it"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-400">⚠️ {error}</p>}
    </section>
  );
}
