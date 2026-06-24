# Walrus Memory (MemWal) feedback — GitHub issues to file

File each at https://github.com/MystenLabs/MemWal/issues to qualify for the feedback prize pool.
All four are real friction we hit building GAFFER on `@mysten-incubation/memwal@0.0.7`.

---

## Issue 1 — `createAccount` needs `registryId`, but `/config` doesn't expose it
**Type:** feature request / DX

`account.createAccount({ packageId, registryId, … })` requires the `AccountRegistry` shared-object id, but the relayer's public `GET /config` only returns `{ packageId, network, suiRpcUrl }`. There's no documented source for the per-network registry id, so programmatic account creation forces you to resolve it on-chain (package → `previousTransaction` → `effects.created` → object of type `…::account::AccountRegistry`).

**Ask:** add `registryId` to `GET /config`, or publish a per-network constants table in the docs/SKILL.md.

**Repro:** call `createAccount` with only the values from `/config`; you can't, because `registryId` is missing.

---

## Issue 2 — `@mysten/sui` v2.6+ removed `SuiClient` from `@mysten/sui/client`; docs still imply it works
**Type:** docs / DX bug

`buildTxContext` in `account.js` does `(await import("@mysten/sui/client")).SuiClient` and throws *"SuiClient not found. For @mysten/sui v2.6.0+, pass suiClient in opts."* On `@mysten/sui@2.20.0`, `@mysten/sui/client` exports `BaseClient/CoreClient` but **not** `SuiClient`. The README account example passes no `suiClient`, so it fails out of the box on current `@mysten/sui`.

**Ask:** document that on `@mysten/sui` v2.x you must pass `suiClient: new SuiJsonRpcClient({ url, network })` (from `@mysten/sui/jsonRpc`), and update the README account snippet.

---

## Issue 3 — package is ESM-only; CJS resolution of subpaths throws `ERR_PACKAGE_PATH_NOT_EXPORTED`
**Type:** packaging / DX bug

`exports` for `./account`, `./manual`, `./ai` define only the `import` condition (no `require`/`default`). Tooling that resolves these under CJS semantics (e.g. `tsx` running a `.ts` file in a project without `"type":"module"`) fails:

```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './account' is not defined by "exports"
```

Workaround: use a `.mts` entry / `"type":"module"`. **Ask:** either ship a CJS build or add a `default` condition, and note the ESM-only requirement prominently in the README.

---

## Issue 4 — `recall` has no default relevance threshold; easy to feed the model filler
**Type:** DX / docs

`recall({ query })` returns up to `limit` results regardless of distance, so naïve callers inject weakly-related memories into prompts. The SKILL.md distance bands are helpful but easy to miss.

**Ask:** consider an optional default `maxDistance`, or surface the recommended `< 0.7` filter directly in the `recall` JSDoc / return payload. (Minor, but it bit us until we added `maxDistance: 0.75`.)

---

### Also worth flagging (lower priority)
- Docs reference `https://relayer.memory.walrus.xyz` while the SDK default `serverUrl` is `https://relayer.memwal.ai`. Both resolve, but clarifying the canonical host would help.
- `remember` → full Walrus upload latency is ~20s; documenting expected timings (and steering bulk/async use) would set expectations.
