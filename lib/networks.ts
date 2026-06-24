/**
 * Walrus Memory deployment constants.
 *
 * Discovered directly from the live relayers (`GET /config`) and verified
 * on-chain (the AccountRegistry shared object created in each package's
 * publish transaction). See README "How we found these" for the trail.
 */
export type MemWalNetwork = "testnet" | "mainnet";

export interface NetworkConfig {
  network: MemWalNetwork;
  /** Relayer base URL (handles embedding, SEAL encryption, Walrus IO). */
  relayerUrl: string;
  /** Walrus Memory Move package id. */
  packageId: string;
  /** Shared `account::AccountRegistry` object id (needed to create accounts). */
  registryId: string;
  /** Sui JSON-RPC fullnode. */
  suiRpcUrl: string;
  /** Suiscan base for receipt links. */
  explorer: string;
  /** Walrus aggregator for direct (encrypted) blob fetch — proof of permanence. */
  walrusAggregator: string;
}

export const NETWORKS: Record<MemWalNetwork, NetworkConfig> = {
  testnet: {
    network: "testnet",
    relayerUrl: "https://relayer-staging.memory.walrus.xyz",
    packageId:
      "0xcf6ad755a1cdff7217865c796778fabe5aa399cb0cf2eba986f4b582047229c6",
    registryId:
      "0xe80f2feec1c139616a86c9f71210152e2a7ca552b20841f2e192f99f75864437",
    suiRpcUrl: "https://fullnode.testnet.sui.io:443",
    explorer: "https://suiscan.xyz/testnet",
    walrusAggregator: "https://aggregator.walrus-testnet.walrus.space",
  },
  mainnet: {
    network: "mainnet",
    relayerUrl: "https://relayer.memwal.ai",
    packageId:
      "0xcee7a6fd8de52ce645c38332bde23d4a30fd9426bc4681409733dd50958a24c6",
    // Discovered on-chain from the package publish tx (effects.created shared
    // object of type ::account::AccountRegistry).
    registryId:
      "0x0da982cefa26864ae834a8a0504b904233d49e20fcc17c373c8bed99c75a7edd",
    suiRpcUrl: "https://fullnode.mainnet.sui.io:443",
    explorer: "https://suiscan.xyz/mainnet",
    walrusAggregator: "https://aggregator.walrus-mainnet.walrus.space",
  },
};

/** Public (encrypted) blob URL — proof the take is permanently on Walrus. */
export function walrusBlobUrl(blobId: string, network = resolveNetwork()): string {
  return `${NETWORKS[network].walrusAggregator}/v1/blobs/${blobId}`;
}

export function resolveNetwork(): MemWalNetwork {
  return (process.env.MEMWAL_NETWORK as MemWalNetwork) === "mainnet"
    ? "mainnet"
    : "testnet";
}
