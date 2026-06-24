/**
 * Server-only Walrus Memory client factory.
 *
 * The delegate private key must NEVER reach the browser — every memory call
 * runs inside a server action or route handler (Node runtime).
 */
import "server-only";
import { MemWal } from "@mysten-incubation/memwal";
import { NETWORKS, resolveNetwork } from "./networks";

export function isProvisioned() {
  return Boolean(process.env.MEMWAL_PRIVATE_KEY && process.env.MEMWAL_ACCOUNT_ID);
}

// Cache one client per namespace so the SEAL session is reused across calls.
const clients = new Map<string, MemWal>();

export function getMemWal(namespace: string): MemWal {
  const cached = clients.get(namespace);
  if (cached) return cached;

  const key = process.env.MEMWAL_PRIVATE_KEY;
  const accountId = process.env.MEMWAL_ACCOUNT_ID;
  if (!key || !accountId) {
    throw new Error(
      "Walrus Memory is not provisioned. Run `pnpm setup:account` to create " +
        "a testnet account and write credentials to .env.local.",
    );
  }
  const cfg = NETWORKS[resolveNetwork()];
  const client = MemWal.create({
    key,
    accountId,
    serverUrl: process.env.MEMWAL_SERVER_URL ?? cfg.relayerUrl,
    namespace,
  });
  clients.set(namespace, client);
  return client;
}

/** Public Suiscan link for a memory account (its on-chain home). */
export function accountExplorerUrl(): string | null {
  const accountId = process.env.MEMWAL_ACCOUNT_ID;
  if (!accountId) return null;
  return `${NETWORKS[resolveNetwork()].explorer}/object/${accountId}`;
}
