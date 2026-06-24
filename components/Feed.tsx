"use client";

import { useMemo, useState } from "react";
import { logTake } from "@/app/actions";
import { takesForTeams, type ParsedTake } from "@/lib/gaffer";
import { FIXTURES, ROUNDS, type Fixture, type Round } from "@/lib/fixtures";

type Choice = "home" | "draw" | "away";

export default function Feed({
  handle,
  takes,
  onReload,
}: {
  handle: string;
  takes: ParsedTake[];
  onReload: () => void;
}) {
  const [round, setRound] = useState<Round | "All">("All");

  const shown = useMemo(
    () => (round === "All" ? FIXTURES : FIXTURES.filter((f) => f.round === round)),
    [round],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* round filter */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {(["All", ...ROUNDS] as (Round | "All")[]).map((r) => (
          <button
            key={r}
            onClick={() => setRound(r)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              round === r
                ? "border-[var(--lime)] bg-[var(--lime)] text-black"
                : "border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] hover:text-white"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* doomscroll feed */}
      <div className="min-h-0 flex-1 snap-y snap-mandatory space-y-4 overflow-y-auto pr-1">
        {shown.map((f) => (
          <MatchCard key={f.id} fixture={f} handle={handle} takes={takes} onReload={onReload} />
        ))}
        <div className="snap-start py-6 text-center text-xs text-[var(--muted)]">
          That&apos;s the bracket. Your calls are on Walrus — come back as results land. 🦭
        </div>
      </div>
    </div>
  );
}

function MatchCard({
  fixture: f,
  handle,
  takes,
  onReload,
}: {
  fixture: Fixture;
  handle: string;
  takes: ParsedTake[];
  onReload: () => void;
}) {
  const relevant = useMemo(
    () => takesForTeams(takes, f.home.name, f.away.name),
    [takes, f.home.name, f.away.name],
  );
  const [choice, setChoice] = useState<Choice | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const note = buildNote(f, relevant);

  async function predict(c: Choice) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setChoice(c);
    const text =
      c === "draw"
        ? `${f.home.name} vs ${f.away.name} ends level.`
        : `${(c === "home" ? f.home : f.away).name} beat ${(c === "home" ? f.away : f.home).name}.`;
    const res = await logTake(handle, "prediction", text, `${f.home.name} v ${f.away.name} · ${f.round}`);
    setBusy(false);
    if (res.ok) {
      setReceipt(res.receipt.url);
      onReload();
    } else {
      setError(res.error);
      setChoice(null);
    }
  }

  return (
    <article className="snap-start rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
      {/* header */}
      <div className="mb-4 flex items-center justify-between text-xs">
        <span className="rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1 font-semibold text-[var(--lime)]">
          {f.round}
          {f.group ? ` · ${f.group}` : ""}
        </span>
        <span className="text-[var(--muted)]">
          {fmtDate(f.date)} · {f.time}
        </span>
      </div>

      {/* teams */}
      <div className="flex items-center justify-between gap-3">
        <TeamSide team={f.home} form={f.homeForm} align="left" />
        <span className="text-sm font-black text-[var(--muted)]">VS</span>
        <TeamSide team={f.away} form={f.awayForm} align="right" />
      </div>

      <div className="mt-1 text-center text-[11px] text-[var(--muted)]">{f.venue}</div>
      {f.note && <p className="mt-3 text-center text-sm text-[var(--text)]/80">{f.note}</p>}

      {/* memory block */}
      <div className="mt-4 rounded-xl border border-[var(--blue)]/40 bg-[var(--blue)]/10 p-3">
        <div className="mb-1 text-xs font-bold text-[var(--blue-soft)]">🧠 GAFFER remembers</div>
        <p className="text-sm leading-snug">{note}</p>
        {relevant.slice(0, 2).map((t) => (
          <a
            key={t.blobId}
            href={t.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 block truncate text-xs text-[var(--muted)] hover:text-[var(--lime)]"
            title={t.text}
          >
            “{t.text}” <span className="opacity-60">· {t.date}</span>
          </a>
        ))}
      </div>

      {/* prediction */}
      <div className="mt-4">
        <div className="mb-1.5 text-xs font-semibold text-[var(--muted)]">
          {receipt ? "Logged on Walrus ✓" : "Your call?"}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <PickButton label={f.home.name} active={choice === "home"} disabled={busy || !!receipt} onClick={() => predict("home")} />
          <PickButton label="Draw" active={choice === "draw"} disabled={busy || !!receipt} onClick={() => predict("draw")} />
          <PickButton label={f.away.name} active={choice === "away"} disabled={busy || !!receipt} onClick={() => predict("away")} />
        </div>
        {busy && <p className="mt-2 text-xs text-[var(--muted)]">Writing your call to Walrus…</p>}
        {receipt && (
          <a href={receipt} target="_blank" rel="noreferrer" className="mt-2 block truncate font-mono text-[10px] text-[var(--muted)] hover:text-[var(--lime)]">
            🔗 receipt {receipt.split("/").pop()?.slice(0, 16)}…
          </a>
        )}
        {error && <p className="mt-2 text-xs text-red-400">⚠️ {error}</p>}
      </div>
    </article>
  );
}

function TeamSide({ team, form, align }: { team: { name: string; flag: string }; form?: string; align: "left" | "right" }) {
  return (
    <div className={`flex flex-1 flex-col ${align === "right" ? "items-end" : "items-start"}`}>
      <div className="text-3xl">{team.flag}</div>
      <div className="mt-1 text-base font-bold">{team.name}</div>
      {form && <Form form={form} />}
    </div>
  );
}

function Form({ form }: { form: string }) {
  return (
    <div className="mt-1 flex gap-1">
      {form.split("").map((r, i) => (
        <span
          key={i}
          className={`grid h-4 w-4 place-items-center rounded text-[9px] font-bold ${
            r === "W" ? "bg-[var(--lime)] text-black" : r === "D" ? "bg-[var(--border)] text-white" : "bg-red-500/70 text-white"
          }`}
        >
          {r}
        </span>
      ))}
    </div>
  );
}

function PickButton({ label, active, disabled, onClick }: { label: string; active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`truncate rounded-lg border px-2 py-2 text-sm font-semibold transition ${
        active
          ? "border-[var(--lime)] bg-[var(--lime)] text-black"
          : "border-[var(--border)] bg-[var(--panel-2)] text-white enabled:hover:border-[var(--lime)] disabled:opacity-50"
      }`}
    >
      {label}
    </button>
  );
}

function buildNote(f: Fixture, relevant: ParsedTake[]): string {
  if (relevant.length === 0) {
    return `No takes on ${f.home.name} or ${f.away.name} yet. Go on — commit one and I'll hold you to it.`;
  }
  const h = relevant.filter((t) => mentions(t, f.home.name)).length;
  const a = relevant.filter((t) => mentions(t, f.away.name)).length;
  if (h && a) {
    return `You've talked up both — ${f.home.name} ${h}× and ${f.away.name} ${a}×. One of those calls dies right here.`;
  }
  if (h) return `You're all-in on ${f.home.name} (${h} take${h > 1 ? "s" : ""} on record). Doubling down, or wobbling?`;
  if (a) return `You've backed ${f.away.name} (${a} take${a > 1 ? "s" : ""}). This is where you find out if you meant it.`;
  return `You've got history with this matchup. Let's see if you stay consistent.`;
}

function mentions(t: ParsedTake, team: string): boolean {
  return `${t.text} ${t.fixture ?? ""}`.toLowerCase().includes(team.toLowerCase());
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m - 1]} ${d}`;
}
