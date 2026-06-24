"use client";

import { useState, useTransition } from "react";
import { getProfile, type TakesPayload } from "@/app/actions";
import type { ParsedTake, TakeKind } from "@/lib/gaffer";

const KIND_META: Record<TakeKind, { emoji: string; color: string }> = {
  prediction: { emoji: "🔮", color: "var(--blue-soft)" },
  opinion: { emoji: "💬", color: "var(--muted)" },
  reaction: { emoji: "🔥", color: "var(--lime)" },
};

export default function Record({
  data,
  handle,
  hasModel,
  onReload,
}: {
  data: TakesPayload | null;
  handle: string;
  hasModel: boolean;
  onReload: () => void;
}) {
  const [profile, setProfile] = useState<string>("");
  const [pending, start] = useTransition();

  const stats = data?.stats;
  const takes = data?.takes ?? [];

  function analyze() {
    start(async () => {
      const res = await getProfile(handle);
      setProfile(res.profile);
    });
  }

  return (
    <aside className="flex min-h-0 flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Your record</h2>
        <button
          onClick={onReload}
          className="text-xs text-[var(--muted)] hover:text-white"
          title="Refresh from Walrus"
        >
          ↻ refresh
        </button>
      </div>

      {/* stat strip */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Predictions" value={stats?.byKind.prediction ?? 0} emoji="🔮" />
        <Stat label="Opinions" value={stats?.byKind.opinion ?? 0} emoji="💬" />
        <Stat label="Reactions" value={stats?.byKind.reaction ?? 0} emoji="🔥" />
      </div>

      {stats && stats.topTeams.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs font-semibold text-[var(--muted)]">
            Teams you can&apos;t stop talking about
          </div>
          <div className="flex flex-wrap gap-1.5">
            {stats.topTeams.map((t) => (
              <span
                key={t.team}
                className="rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1 text-xs"
              >
                {t.team} <span className="text-[var(--muted)]">×{t.mentions}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={analyze}
        disabled={pending || takes.length === 0 || !hasModel}
        className="rounded-xl border border-[var(--lime)] bg-[var(--lime)]/10 px-3 py-2 text-sm font-bold text-[var(--lime)] transition enabled:hover:bg-[var(--lime)]/20 disabled:opacity-40"
      >
        {pending ? "Reading your football brain…" : "🧠 Analyse my football brain"}
      </button>

      {profile && <Profile text={profile} />}

      {/* feed */}
      <div className="min-h-0 flex-1">
        <div className="mb-2 text-xs font-semibold text-[var(--muted)]">
          On the record ({takes.length})
        </div>
        <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1 lg:max-h-none">
          {takes.length === 0 && (
            <p className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--muted)]">
              No takes yet. Log one above or just start talking — GAFFER writes
              every real take to Walrus.
            </p>
          )}
          {takes.map((t) => (
            <TakeRow key={t.blobId} take={t} />
          ))}
        </div>
      </div>
    </aside>
  );
}

function Stat({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-2.5 text-center">
      <div className="text-lg font-black">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
        {emoji} {label}
      </div>
    </div>
  );
}

function TakeRow({ take }: { take: ParsedTake }) {
  const meta = KIND_META[take.kind];
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span style={{ color: meta.color }} className="font-semibold">
          {meta.emoji} {take.kind}
          {take.fixture ? ` · ${take.fixture}` : ""}
        </span>
        <span className="text-[var(--muted)]">{take.date}</span>
      </div>
      <p className="text-sm leading-snug">{take.text}</p>
      {take.url && (
        <a
          href={take.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 block truncate font-mono text-[10px] text-[var(--muted)] hover:text-[var(--lime)]"
          title={take.blobId}
        >
          🔗 walrus blob {take.blobId.slice(0, 18)}…
        </a>
      )}
    </div>
  );
}

/** Tiny markdown-ish renderer for the profile (### headers + lines). */
function Profile({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3 text-sm">
      {text.split("\n").map((line, i) => {
        const h = line.match(/^#{1,4}\s+(.*)/);
        if (h) {
          return (
            <p key={i} className="pt-1 text-sm font-bold text-[var(--lime)]">
              {h[1]}
            </p>
          );
        }
        if (!line.trim()) return null;
        return (
          <p key={i} className="leading-snug text-[var(--text)]/90">
            {line.replace(/^[-*]\s+/, "• ")}
          </p>
        );
      })}
    </div>
  );
}
