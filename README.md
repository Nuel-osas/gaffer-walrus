# 🦭 GAFFER — your World Cup take-keeper

**An AI football pundit that remembers every prediction, opinion and reaction you give it across the 2026 FIFA World Cup — and keeps the receipts on [Walrus Memory](https://walrus.xyz/products/walrus-memory/).**

> Built for **Walrus Sessions 4**. The gimmick that makes it *Walrus*-native: your takes are written to decentralised, verifiable, immutable storage. You **cannot quietly delete a bad prediction** — GAFFER has the blob, on-chain, forever. So it holds you to it.

---

## Why this fits the brief

The brief: *"an AI agent that remembers your predictions, opinions, and reactions across the tournament using Walrus Memory."* GAFFER maps 1:1 onto what makes Walrus Memory different from a chatbot with a database:

| Walrus Memory property | How GAFFER uses it |
|---|---|
| **Permanent** | Every take is a blob you can link to forever — "receipts you can't delete." |
| **Verifiable** | Each take links to its Walrus blob + the on-chain memory account. |
| **Semantic recall** | GAFFER recalls *relevant* old takes by meaning, then confronts you with them. |
| **Portable / owned** | Memories live in *your* MemWal account on Sui, not in our DB. |

It does three things:

1. **Log takes** — predictions (🔮), opinions (💬), reactions (🔥). Each is stored to Walrus and returns a **receipt** (a blob id you can open).
2. **Chat** — talk football. GAFFER semantically recalls your past takes, quotes them back, celebrates the right calls and roasts the wrong ones. New takes you make in chat are captured to Walrus automatically.
3. **Football-brain profile** — GLM analyses your entire on-record history: biases, patterns, boldest takes, and the predictions you're now **on the hook** for.

---

## How it works

```
 Browser ──▶ Next.js (server actions + /api/chat)
                 │
                 ├── GLM 5.2 (OpenAI-compatible) ── via Vercel AI SDK ── the pundit voice
                 │
                 └── @mysten-incubation/memwal ──▶ Walrus Memory relayer (TEE)
                                                      │ embeds · SEAL-encrypts · stores
                                                      ▼
                                              Walrus (blobs) + Sui (ownership)
```

- **Memory:** `lib/memwal.ts` builds a server-only MemWal client (the delegate key never reaches the browser). Takes are stored with `rememberAndWait`, recalled with `recall({ query, maxDistance })`.
- **Format:** takes are stored as one tagged-but-natural line — `[prediction · 2026-06-23 · BRA v CRO] Brazil win 2-1…` — so the tag is parseable *and* the prose embeds well for semantic search (`lib/gaffer.ts`).
- **Model:** GLM 5.2 through `@ai-sdk/openai-compatible` (`lib/model.ts`), swappable via env.
- **Isolation:** each handle gets its own memory namespace (`gaffer:<handle>`).

---

## Quickstart

```bash
pnpm install

# 1. Provision Walrus Memory (free testnet account, faucet-funded, one command).
#    Generates a Sui wallet, creates a MemWalAccount on-chain, registers a
#    delegate key, and writes credentials to .env.local. No browser wallet needed.
pnpm setup:account

# 2. Add a model key for GAFFER's voice (get one at https://z.ai).
echo 'GLM_API_KEY=your-key-here' >> .env.local

# 3. Run it.
pnpm dev   # → http://localhost:3000
```

Memory works the moment `setup:account` finishes; chat + profile wake up once `GLM_API_KEY` is set.

> Mainnet instead of testnet: `MEMWAL_NETWORK=mainnet pnpm setup:account` (the wallet needs a little real SUI for gas; the registry id is auto-discovered on-chain).

---

## 60-second demo (for judges)

1. Enter a handle (e.g. `@gaffer-demo`).
2. **Log a prediction:** *"Brazil win the whole thing, Vini golden boot."* → a Walrus receipt pops up.
3. Log an opinion and a reaction too (e.g. *"England always bottle the quarters."*).
4. **Open the chat:** ask *"who's winning it?"* — GAFFER recalls your Brazil pick and backs/challenges it.
5. Type a fresh take in chat: *"Actually France look unstoppable."* — watch it appear in **Your record** (auto-captured to Walrus).
6. Hit **🧠 Analyse my football brain** — GLM profiles your biases and lists the predictions you're on the hook for.
7. Click any **walrus blob** link — that take is permanently, verifiably on Walrus. Try to delete it. You can't. That's the point.

---

## Implementation notes (the un-obvious bits)

- **Zero-touch credentials.** `scripts/setup-account.mts` automates what the dashboard does by hand: resolves the relayer's `packageId` from `GET /config`, funds a generated wallet from the testnet faucet (retrying past rate limits), calls `account::create_account`, and registers a delegate key.
- **Finding the testnet `AccountRegistry`.** `createAccount` needs the registry shared-object id, which isn't in `/config`. We resolved it on-chain from the package's publish transaction (`sui_getObject → previousTransaction → effects.created`, type `…::account::AccountRegistry`) and pinned it in `lib/networks.ts`. The script auto-discovers it if left blank.
- **Streaming chat** reads the AI SDK's `toTextStreamResponse()` manually on the client — no extra chat-protocol dependency.
- **Smoke test:** `npx tsx scripts/smoke-memory.mts` proves a live remember → recall round-trip against the relayer.

## Stack

Next.js 16 · React 19 · Tailwind 4 · Vercel AI SDK 6 · `@mysten-incubation/memwal` · Sui (testnet) · GLM 5.2
