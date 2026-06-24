/**
 * Seed a realistic dated take-history so the before/after "memory moment" is
 * demonstrable. Each take is tagged with the date it was (notionally) made, so
 * GAFFER genuinely recalls "what you said 10 days ago".
 *
 *   SEED_HANDLE=gaffer-demo pnpm seed
 *
 * Disclosed honestly in SUBMISSION.md: this backfills a coherent fan profile
 * across the group stage rather than waiting days of real-time use.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { MemWal } from "@mysten-incubation/memwal";
import { formatTake, namespaceFor, type TakeKind } from "../lib/gaffer";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const handle = process.env.SEED_HANDLE ?? "gaffer-demo";
const ns = namespaceFor(handle);

// A coherent fan: Brazil superfan, England pessimist, Mbappé sceptic,
// Morocco believer, serial VAR complainer — with calls that can be roasted.
const TAKES: { date: string; kind: TakeKind; text: string; fixture?: string }[] = [
  { date: "2026-06-11", kind: "prediction", text: "Brazil win the whole thing. Vinicius finishes as top scorer, mark my words.", fixture: "Tournament" },
  { date: "2026-06-12", kind: "opinion", text: "England always start slow and bottle the knockouts. Every single time." },
  { date: "2026-06-13", kind: "prediction", text: "Final will be Argentina vs France. Everyone else is fighting for third.", fixture: "Final" },
  { date: "2026-06-14", kind: "reaction", text: "TOLD YOU. Brazil 3-0, Vini with a brace. Easiest prediction of my life.", fixture: "BRA v SRB" },
  { date: "2026-06-15", kind: "opinion", text: "Mbappé is wildly overrated when it actually matters. Disappears in big games." },
  { date: "2026-06-16", kind: "prediction", text: "USA crash out in the group stage. Hosts or not, that midfield is too soft.", fixture: "USA group" },
  { date: "2026-06-17", kind: "reaction", text: "England scrape a 1-1 draw and look terrified. Here we go again, lads." , fixture: "ENG v group"},
  { date: "2026-06-18", kind: "prediction", text: "Morocco are the dark horse. I'm calling a semi-final run, you heard it here.", fixture: "Knockouts" },
  { date: "2026-06-19", kind: "opinion", text: "VAR is ruining the flow of every single match. Let them play." },
  { date: "2026-06-20", kind: "reaction", text: "Called the Brazil result AGAIN. I am simply never wrong about the Seleção.", fixture: "BRA v group" },
  { date: "2026-06-21", kind: "prediction", text: "Spain's tiki-taka gets bullied out of it by the first physical side they meet." },
  { date: "2026-06-22", kind: "opinion", text: "Bellingham is the only genuinely world-class player England have. The rest are passengers." },
  { date: "2026-06-23", kind: "reaction", text: "France 0-0 snoozefest, Mbappé anonymous. Exactly like I said. Overrated.", fixture: "FRA v group" },
];

async function main() {
  if (!process.env.MEMWAL_PRIVATE_KEY || !process.env.MEMWAL_ACCOUNT_ID) {
    throw new Error("Run `pnpm setup:account` first (no MemWal credentials).");
  }
  const memwal = MemWal.create({
    key: process.env.MEMWAL_PRIVATE_KEY,
    accountId: process.env.MEMWAL_ACCOUNT_ID,
    serverUrl: process.env.MEMWAL_SERVER_URL!,
    namespace: ns,
  });

  console.log(`\n🌱 Seeding ${TAKES.length} dated takes into ${ns}\n`);
  const items = TAKES.map((t) => ({
    text: formatTake(t.kind, t.text, { date: t.date, fixture: t.fixture }),
    namespace: ns,
  }));

  const res = await memwal.rememberBulkAndWait(items, { timeoutMs: 180_000 });
  console.log(`   ✅ ${res.succeeded}/${res.total} stored, ${res.failed} failed`);
  for (const r of res.results) {
    console.log(`   ${r.status === "done" ? "•" : "✗"} ${r.blob_id?.slice(0, 16) || r.error}`);
  }
  console.log(`\nDone. Open the app as @${handle} to see the populated record.\n`);
}

main().catch((e) => {
  console.error("\n❌ seed failed:\n", e);
  process.exit(1);
});
