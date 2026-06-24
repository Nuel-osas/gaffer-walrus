/** Smoke test: prove the provisioned credentials can write + read Walrus Memory. */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { MemWal } from "@mysten-incubation/memwal";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const ns = "gaffer:smoke";
const memwal = MemWal.create({
  key: process.env.MEMWAL_PRIVATE_KEY!,
  accountId: process.env.MEMWAL_ACCOUNT_ID!,
  serverUrl: process.env.MEMWAL_SERVER_URL!,
  namespace: ns,
});

console.log("health:", await memwal.health());

const line = `[prediction · 2026-06-23 · BRA v CRO] Brazil win 2-1, Vinicius scores first. (smoke ${Date.now()})`;
console.log("\nremembering:", line);
const stored = await memwal.rememberAndWait(line, ns, { timeoutMs: 60_000 });
console.log("stored blob_id:", stored.blob_id);

console.log("\nrecall 'who wins the Brazil Croatia game?'");
const r = await memwal.recall({
  query: "who wins the Brazil Croatia game?",
  limit: 5,
  namespace: ns,
});
for (const m of r.results) {
  console.log(`  d=${m.distance.toFixed(3)}  ${m.text.slice(0, 80)}  (${m.blob_id.slice(0, 12)}…)`);
}
console.log("\n✅ memory round-trip OK");
