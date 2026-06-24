/**
 * Generate a fresh, isolated funding wallet and point .env.local at mainnet.
 * You then send a little SUI (~0.1) to the printed address and run
 * `MEMWAL_NETWORK=mainnet pnpm setup:account`.
 *
 * This keeps your main wallet's key off disk — the generated wallet only ever
 * holds gas money for creating the MemWalAccount + delegate key.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { NETWORKS } from "../lib/networks";

const ENV = resolve(process.cwd(), ".env.local");

function readEnv(): Record<string, string> {
  if (!existsSync(ENV)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(ENV, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const prev = readEnv();
const kp = new Ed25519Keypair();
const address = kp.getPublicKey().toSuiAddress();

// Fresh mainnet env: keep GLM_*, drop stale (testnet) account + delegate creds.
const next: Record<string, string> = {
  MEMWAL_NETWORK: "mainnet",
  MEMWAL_SERVER_URL: NETWORKS.mainnet.relayerUrl,
  SUI_PRIVATE_KEY: kp.getSecretKey(),
  GLM_API_KEY: prev.GLM_API_KEY ?? "",
  GLM_BASE_URL: prev.GLM_BASE_URL ?? "https://api.z.ai/api/paas/v4",
  GLM_MODEL: prev.GLM_MODEL ?? "glm-5.2",
};

writeFileSync(
  ENV,
  Object.entries(next)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n",
);

console.log("\n🦭 New mainnet funding wallet created.\n");
console.log("   Send ~0.1 SUI (mainnet) to this address:\n");
console.log(`      ${address}\n`);
console.log(`   Check it: ${NETWORKS.mainnet.explorer}/account/${address}`);
console.log("\n   Then run:  MEMWAL_NETWORK=mainnet pnpm setup:account\n");
