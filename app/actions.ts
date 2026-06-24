"use server";

import { generateText } from "ai";
import { getMemWal, accountExplorerUrl } from "@/lib/memwal";
import { walrusBlobUrl } from "@/lib/networks";
import { gafferModel, hasModelKey } from "@/lib/model";
import {
  formatTake,
  parseTake,
  namespaceFor,
  computeStats,
  todayISO,
  RECALL_ALL_QUERY,
  type TakeKind,
  type ParsedTake,
  type ScorecardStats,
} from "@/lib/gaffer";

export interface Receipt {
  blobId: string;
  url: string;
  kind: TakeKind;
  date: string;
  fixture?: string;
  text: string;
}

export type LogResult =
  | { ok: true; receipt: Receipt }
  | { ok: false; error: string };

/** Put a take on the record — stored immutably on Walrus, returns its receipt. */
export async function logTake(
  handle: string,
  kind: TakeKind,
  text: string,
  fixture?: string,
): Promise<LogResult> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Say something first." };
  try {
    const ns = namespaceFor(handle);
    const memwal = getMemWal(ns);
    const line = formatTake(kind, trimmed, { fixture });
    const stored = await memwal.rememberAndWait(line, ns, { timeoutMs: 90_000 });
    return {
      ok: true,
      receipt: {
        blobId: stored.blob_id,
        url: walrusBlobUrl(stored.blob_id),
        kind,
        date: todayISO(),
        fixture: fixture?.trim() || undefined,
        text: trimmed,
      },
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export interface TakesPayload {
  takes: ParsedTake[];
  stats: ScorecardStats;
  accountUrl: string | null;
  aggregator: string;
}

/** Pull every take in the user's namespace (newest first) + computed stats. */
export async function getTakes(handle: string): Promise<TakesPayload> {
  const ns = namespaceFor(handle);
  const memwal = getMemWal(ns);
  const r = await memwal.recall({
    query: RECALL_ALL_QUERY,
    limit: 100,
    namespace: ns,
  });
  const takes = r.results
    .map(parseTake)
    .map((t) => ({ ...t, url: walrusBlobUrl(t.blobId) }))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return {
    takes,
    stats: computeStats(takes),
    accountUrl: accountExplorerUrl(),
    aggregator: walrusBlobUrl(""),
  };
}

/** GLM-written "football brain" profile over the user's recalled takes. */
export async function getProfile(
  handle: string,
): Promise<{ profile: string; stats: ScorecardStats; count: number }> {
  const { takes, stats } = await getTakes(handle);
  if (takes.length === 0) {
    return { profile: "", stats, count: 0 };
  }
  if (!hasModelKey()) {
    return {
      profile:
        "⚠️ Add GLM_API_KEY to .env.local to let GAFFER analyse your football brain.",
      stats,
      count: takes.length,
    };
  }
  const list = takes
    .map((t) => `- [${t.kind}${t.date ? ` ${t.date}` : ""}] ${t.text}`)
    .join("\n");

  const { text } = await generateText({
    model: gafferModel,
    system:
      "You are GAFFER, a witty football pundit. You are handed the complete, " +
      "permanent record of one fan's World Cup takes (stored on Walrus). " +
      "Write a punchy 'football brain' profile.",
    prompt: `Fan: @${handle}
Their on-the-record takes:
${list}

Write the profile with these sections, using markdown headers:
### 🧠 Your football brain
One or two sentences capturing their overall vibe.
### 📌 Biases & patterns
The teams/players they lean toward or against, and any recurring habits.
### 🔥 Boldest takes
The 1-3 spiciest calls, quoted.
### 🪤 On the hook
Predictions they've made that are now testable — what you'll be holding them to.
Keep it fun and specific. Don't invent takes that aren't listed.`,
  });

  return { profile: text, stats, count: takes.length };
}
