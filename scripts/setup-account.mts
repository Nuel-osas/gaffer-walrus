/**
 * One-command Walrus Memory provisioning.
 *
 *   pnpm setup:account              # testnet (free, faucet-funded)
 *   MEMWAL_NETWORK=mainnet pnpm setup:account
 *
 * What it does (server-side, no browser wallet needed):
 *   1. Loads or generates a Sui Ed25519 keypair (persisted to .env.local).
 *   2. On testnet, tops the wallet up from the faucet.
 *   3. Creates a MemWalAccount on-chain via the account::create_account contract.
 *   4. Generates a delegate key and registers it on the account.
 *   5. Writes MEMWAL_* credentials into .env.local.
 *
 * Re-running is safe: if .env.local already has an account it exits early
 * (pass --force to provision a brand-new wallet + account).
 */
import { config as loadEnv } from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { getFaucetHost, requestSuiFromFaucetV2 } from "@mysten/sui/faucet";
import {
  createAccount,
  generateDelegateKey,
  addDelegateKey,
} from "@mysten-incubation/memwal/account";

import { NETWORKS, resolveNetwork, type MemWalNetwork } from "../lib/networks";

const ENV_PATH = resolve(process.cwd(), ".env.local");
const FORCE = process.argv.includes("--force");

function readEnv(): Record<string, string> {
  if (!existsSync(ENV_PATH)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

function writeEnv(merged: Record<string, string>) {
  const order = [
    "MEMWAL_NETWORK",
    "MEMWAL_SERVER_URL",
    "MEMWAL_ACCOUNT_ID",
    "MEMWAL_PRIVATE_KEY",
    "SUI_PRIVATE_KEY",
    "GLM_API_KEY",
    "GLM_BASE_URL",
    "GLM_MODEL",
  ];
  const keys = [...new Set([...order, ...Object.keys(merged)])];
  const body = keys
    .filter((k) => merged[k] !== undefined && merged[k] !== "")
    .map((k) => `${k}=${merged[k]}`)
    .join("\n");
  writeFileSync(ENV_PATH, body + "\n");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Direct suix_getBalance — avoids client-version API drift. */
async function getBalanceMist(rpcUrl: string, owner: string): Promise<bigint> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "suix_getBalance",
      params: [owner],
    }),
  });
  const json = await res.json();
  return BigInt(json?.result?.totalBalance ?? "0");
}

/** Fund from the testnet faucet, retrying past rate limits until gas lands. */
async function fundAndWait(rpcUrl: string, address: string) {
  const deadline = Date.now() + 5 * 60_000;
  let attempt = 0;
  while (Date.now() < deadline) {
    const bal = await getBalanceMist(rpcUrl, address);
    if (bal > 50_000_000n) {
      console.log(`   ✅ balance: ${Number(bal) / 1e9} SUI`);
      return;
    }
    attempt++;
    try {
      console.log(`   💧 faucet request (attempt ${attempt})…`);
      await requestSuiFromFaucetV2({
        host: getFaucetHost("testnet"),
        recipient: address,
      });
    } catch (e) {
      console.log(`      rate-limited: ${(e as Error).message.slice(0, 70)}`);
    }
    await sleep(15_000);
  }
  throw new Error(
    `Faucet did not deliver gas in time. Fund this address at ` +
      `https://faucet.sui.io (Testnet), then re-run \`pnpm setup:account\`:\n   ${address}`,
  );
}

/** Resolve the AccountRegistry shared object from the package publish tx. */
async function discoverRegistry(
  client: SuiJsonRpcClient,
  packageId: string,
): Promise<string> {
  const pkg = await client.core.getObject({ objectId: packageId });
  // @ts-expect-error - shape varies across client versions; we only need the digest
  const digest: string = pkg.object?.previousTransaction ?? pkg.previousTransaction;
  const tx = await client.core.getTransaction({ digest });
  // @ts-expect-error - effects shape
  const created = tx.transaction?.effects?.changedObjects ?? [];
  for (const c of created) {
    const type = c.outputState?.type ?? "";
    if (type.includes("::account::AccountRegistry")) return c.id;
  }
  throw new Error(
    `Could not auto-discover AccountRegistry for ${packageId}. Set registryId in lib/networks.ts.`,
  );
}

async function main() {
  loadEnv({ path: ENV_PATH });
  const env = readEnv();
  const network: MemWalNetwork = resolveNetwork();
  const cfg = NETWORKS[network];

  console.log(`\n🦭  Walrus Memory setup — ${network}\n`);

  if (!FORCE && env.MEMWAL_ACCOUNT_ID && env.MEMWAL_PRIVATE_KEY) {
    console.log("✅ .env.local already provisioned. Use --force to recreate.\n");
    console.log(`   account:  ${env.MEMWAL_ACCOUNT_ID}`);
    console.log(`   relayer:  ${env.MEMWAL_SERVER_URL}`);
    return;
  }

  const client = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl(network),
    network,
  });

  // 1. Sui keypair (reuse persisted one unless --force).
  let keypair: Ed25519Keypair;
  if (env.SUI_PRIVATE_KEY && !FORCE) {
    keypair = Ed25519Keypair.fromSecretKey(env.SUI_PRIVATE_KEY);
  } else {
    keypair = new Ed25519Keypair();
  }
  const suiPrivateKey = keypair.getSecretKey();
  const address = keypair.getPublicKey().toSuiAddress();
  console.log(`👛 Sui wallet: ${address}`);

  // Persist the wallet key immediately so faucet drips + retries reuse this
  // exact address (never strand gas on an abandoned wallet).
  writeEnv({
    ...env,
    MEMWAL_NETWORK: network,
    MEMWAL_SERVER_URL: cfg.relayerUrl,
    SUI_PRIVATE_KEY: suiPrivateKey,
  });

  // 2. Fund on testnet (retry past rate limits, poll until gas lands).
  if (network === "testnet") {
    console.log("💧 Funding wallet from testnet faucet…");
    await fundAndWait(cfg.suiRpcUrl, address);
  } else {
    const bal = await getBalanceMist(cfg.suiRpcUrl, address);
    if (bal <= 50_000_000n) {
      throw new Error(
        `Mainnet wallet ${address} needs a little SUI for gas (has ${
          Number(bal) / 1e9
        }).`,
      );
    }
  }

  // 3. Registry (auto-discover if not pinned).
  const registryId = cfg.registryId || (await discoverRegistry(client, cfg.packageId));
  console.log(`📇 AccountRegistry: ${registryId}`);

  // 4. Create the MemWalAccount.
  console.log("🏗️  Creating MemWalAccount on-chain…");
  let accountId = env.MEMWAL_ACCOUNT_ID ?? "";
  if (!accountId || FORCE) {
    const acct = await createAccount({
      packageId: cfg.packageId,
      registryId,
      suiPrivateKey,
      suiClient: client,
      suiNetwork: network,
    });
    accountId = acct.accountId;
    console.log(`   account: ${accountId}`);
    console.log(`   tx: ${cfg.explorer}/tx/${acct.digest}`);
  }

  // 5. Delegate key + register it on the account.
  console.log("🔑 Generating + registering delegate key…");
  const delegate = await generateDelegateKey();
  await addDelegateKey({
    packageId: cfg.packageId,
    accountId,
    publicKey: delegate.publicKey,
    label: "gaffer",
    suiPrivateKey,
    suiClient: client,
    suiNetwork: network,
  });

  // 6. Persist credentials.
  writeEnv({
    ...env,
    MEMWAL_NETWORK: network,
    MEMWAL_SERVER_URL: cfg.relayerUrl,
    MEMWAL_ACCOUNT_ID: accountId,
    MEMWAL_PRIVATE_KEY: delegate.privateKey,
    SUI_PRIVATE_KEY: suiPrivateKey,
  });

  console.log(`\n✅ Done. Credentials written to .env.local\n`);
  console.log(`   account:  ${accountId}`);
  console.log(`   relayer:  ${cfg.relayerUrl}`);
  console.log(`   explorer: ${cfg.explorer}/object/${accountId}\n`);
  console.log("Next: add GLM_API_KEY to .env.local, then `pnpm dev`.\n");
}

main().catch((e) => {
  console.error("\n❌ setup failed:\n", e);
  process.exit(1);
});
