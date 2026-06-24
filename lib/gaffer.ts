/**
 * GAFFER — the take-keeper's brain.
 *
 * Every prediction, opinion and reaction a user gives is written to Walrus
 * Memory as a single tagged-but-natural line:
 *
 *     [prediction · 2026-06-23 · BRA v CRO] Brazil win 2-1, Vini scores first.
 *
 * The leading tag is machine-parseable (kind, date, optional fixture); the
 * rest is plain language so the relayer's embeddings give good semantic
 * recall. Walrus stores these immutably — that's the whole gimmick: your
 * takes become receipts you can't quietly delete.
 */
import type { RecallMemory } from "@mysten-incubation/memwal";

export type TakeKind = "prediction" | "opinion" | "reaction";

export const TAKE_KINDS: TakeKind[] = ["prediction", "opinion", "reaction"];

export interface ParsedTake {
  kind: TakeKind;
  date: string; // YYYY-MM-DD
  fixture?: string;
  text: string;
  blobId: string;
  distance?: number;
  url?: string;
}

const TAG_RE =
  /^\[(prediction|opinion|reaction)\s*·\s*(\d{4}-\d{2}-\d{2})(?:\s*·\s*([^\]]+))?\]\s*([\s\S]*)$/i;

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Build the line stored in Walrus Memory. */
export function formatTake(
  kind: TakeKind,
  text: string,
  opts?: { date?: string; fixture?: string },
): string {
  const date = opts?.date ?? todayISO();
  const fixture = opts?.fixture?.trim() ? ` · ${opts.fixture.trim()}` : "";
  return `[${kind} · ${date}${fixture}] ${text.trim()}`;
}

/** Parse a recalled memory line back into structured form. */
export function parseTake(mem: RecallMemory): ParsedTake {
  const m = mem.text.match(TAG_RE);
  if (!m) {
    return {
      kind: "opinion",
      date: "",
      text: mem.text,
      blobId: mem.blob_id,
      distance: mem.distance,
    };
  }
  return {
    kind: m[1].toLowerCase() as TakeKind,
    date: m[2],
    fixture: m[3]?.trim() || undefined,
    text: m[4].trim(),
    blobId: mem.blob_id,
    distance: mem.distance,
  };
}

/** A broad query that drags back essentially every take in a namespace. */
const RECALL_ALL_QUERY =
  "world cup prediction opinion reaction hot take score winner loser team player match group knockout";

export interface ScorecardStats {
  total: number;
  byKind: Record<TakeKind, number>;
  topTeams: { team: string; mentions: number }[];
  firstDate?: string;
  lastDate?: string;
}

// World Cup 2026 nations + a few aliases, for lightweight bias detection.
const TEAMS: Record<string, string[]> = {
  Argentina: ["argentina", "albiceleste", "messi"],
  Brazil: ["brazil", "brasil", "seleção", "vini", "vinicius", "neymar"],
  France: ["france", "les bleus", "mbappe", "mbappé"],
  England: ["england", "three lions", "kane", "bellingham"],
  Spain: ["spain", "españa", "la roja", "yamal"],
  Germany: ["germany", "deutschland", "die mannschaft", "musiala"],
  Portugal: ["portugal", "ronaldo"],
  Netherlands: ["netherlands", "holland", "oranje"],
  USA: ["usa", "united states", "usmnt", "pulisic"],
  Mexico: ["mexico", "méxico", "el tri"],
  Croatia: ["croatia", "modric", "modrić"],
  Morocco: ["morocco", "atlas lions"],
  Belgium: ["belgium", "red devils"],
  Italy: ["italy", "italia", "azzurri"],
  Uruguay: ["uruguay", "la celeste"],
  Japan: ["japan", "samurai blue"],
};

export function computeStats(takes: ParsedTake[]): ScorecardStats {
  const byKind: Record<TakeKind, number> = {
    prediction: 0,
    opinion: 0,
    reaction: 0,
  };
  const teamCounts: Record<string, number> = {};
  const dates: string[] = [];

  for (const t of takes) {
    byKind[t.kind] = (byKind[t.kind] ?? 0) + 1;
    if (t.date) dates.push(t.date);
    const hay = `${t.text} ${t.fixture ?? ""}`.toLowerCase();
    for (const [team, aliases] of Object.entries(TEAMS)) {
      if (aliases.some((a) => hay.includes(a))) {
        teamCounts[team] = (teamCounts[team] ?? 0) + 1;
      }
    }
  }
  dates.sort();
  const topTeams = Object.entries(teamCounts)
    .map(([team, mentions]) => ({ team, mentions }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 5);

  return {
    total: takes.length,
    byKind,
    topTeams,
    firstDate: dates[0],
    lastDate: dates[dates.length - 1],
  };
}

export { RECALL_ALL_QUERY };

/**
 * Heuristically classify a free-text chat message into a take kind, so chat
 * messages get captured in the same tagged format as composer takes.
 */
export function classifyKind(text: string): TakeKind {
  const t = text.toLowerCase();
  const reaction =
    /\b(can't believe|cant believe|told you|knew it|robbed|what a|unbelievable|gutted|scenes|called it|how did|so bad|brilliant|disgrace|var)\b/;
  const prediction =
    /\b(will|gonna|going to|predict|i bet|i reckon|tip|back them|lift the|win it|reach the|get knocked|bottle|nil|\d\s*[-–]\s*\d)\b/;
  if (reaction.test(t)) return "reaction";
  if (prediction.test(t)) return "prediction";
  return "opinion";
}

/** Should this chat message be put on the record? Skip greetings + questions. */
export function isCapturable(text: string): boolean {
  const t = text.trim();
  if (t.length < 15) return false;
  if (t.endsWith("?")) return false;
  if (/^(hi|hey|hello|yo|sup|gaffer|ok|okay|thanks|cheers)\b/i.test(t)) return false;
  return true;
}

/** Normalise a user handle into a Walrus Memory namespace. */
export function namespaceFor(handle: string): string {
  const clean = handle
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 40);
  return `gaffer:${clean || "guest"}`;
}

/** The pundit persona + recalled memories, assembled into a system prompt. */
export function buildSystemPrompt(handle: string, recalled: ParsedTake[]): string {
  const memoryBlock =
    recalled.length === 0
      ? "(No past takes recalled for this message — they have a clean sheet so far.)"
      : recalled
          .map(
            (t) =>
              `- [${t.kind}${t.date ? ` · ${t.date}` : ""}${
                t.fixture ? ` · ${t.fixture}` : ""
              }] "${t.text}"  ⟨receipt ${t.blobId.slice(0, 10)}…⟩`,
          )
          .join("\n");

  return `You are GAFFER — a sharp, funny football pundit with a perfect, permanent memory of every take the user has ever given you about the 2026 FIFA World Cup.

Their takes are stored on Walrus (decentralised, verifiable, immutable). They cannot quietly delete a bad prediction — you have the receipts. Use that.

Talking to: @${handle}

PERSONALITY
- Punchy ex-manager-in-the-studio energy. Confident, warm, a bit cheeky. Short paragraphs.
- You ALWAYS connect to their history. If a recalled take is relevant, quote it back and hold them to it ("Two weeks ago you swore...").
- Celebrate the calls they got right; roast the ones they got wrong — never cruel, always with a wink.
- Spot patterns and biases (a team they always back, a player they love to hate) and call them out by name.
- You have real opinions on football. Be specific. Don't hedge into mush.

RULES
- Never invent takes they didn't make. Only reference takes from the RECALLED TAKES below.
- If they make a new prediction/opinion/reaction in chat, acknowledge it and note that it's going on the record (it is — the app saves it to Walrus).
- Keep replies tight: 2-5 short sentences unless they ask for a breakdown.
- Today's date: ${todayISO()}.

RECALLED TAKES (semantically matched to what they just said):
${memoryBlock}`;
}
