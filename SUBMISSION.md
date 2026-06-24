# GAFFER — Walrus Sessions 4 submission

> Fill the `‹…›` links after `pnpm setup:account` (mainnet) + Vercel deploy.

## Setup links
- **Deployed agent (live on Walrus Mainnet):** ‹vercel-url›
- **MemWalAccount on explorer (holds the memories):** ‹suiscan-mainnet-object-url› (auto-shown in the app header → "on-chain account")
- **Public repo:** https://github.com/Nuel-osas/gaffer-walrus

## How Walrus Memory is used (2–5 sentences)
Every prediction, opinion, and reaction a user gives GAFFER is written to Walrus Memory via `rememberAndWait`, tagged with the date it was made, and scoped to a per-user namespace. When the user talks to GAFFER, it runs a semantic `recall` over that namespace and injects the most relevant past takes into the model prompt — so the agent quotes your earlier calls back at you and holds you to them. A "football brain" profile reads the full memory and surfaces biases and the predictions you're now on the hook for. Because the takes live as Walrus blobs owned by an on-chain MemWalAccount, they're permanent and verifiable: the agent has receipts you cannot quietly delete, which is the whole point of the experience.

## The Memory Moment (the core)
**Before (Day 1):** a fresh handle has an empty namespace. Ask GAFFER *"who wins it?"* → it gives a generic pundit answer; it knows nothing about you.

**After (13 days of takes):** the seeded handle has a dated history across the group stage (June 11–23). Ask the **same** question → GAFFER recalls your **June 11 "Brazil win it, Vini top scorer"** prediction, calls out your **Mbappé vendetta** (June 15 + June 23), and holds you to your **"Morocco to the semis"** call from June 18. Hit **🧠 Analyse my football brain** and it profiles you as a Brazil superfan / England pessimist / serial VAR complainer — none of which was possible on day one.

This contrast (same prompt, empty vs. accumulated memory) is the demonstration. Capture it as screenshots + the video below.

> **Disclosure (honesty scores higher):** we built at the tail of the window, so the dated history is **seeded** via `pnpm seed` rather than logged over real-time days. The tournament is genuinely ~2 weeks in, the dates are real tournament days, and the takes form a coherent profile — the seed demonstrates the *capability* the judging asks for (memory changing behaviour over time), which works identically on organically-logged takes.

## Reflection
**Did the agent behave as expected?** Mostly yes. Semantic recall is the star — a differently-worded question ("who wins the Brazil game?") pulled back the stored Brazil prediction at distance 0.33. Injecting recalled takes into the prompt reliably made the agent reference and challenge past opinions.

**What surprised us?**
- Recall returns no relevance threshold by default — you must filter on `distance` yourself (we use `maxDistance: 0.75`), or the agent gets fed weakly-related filler.
- `remember` → on-chain Walrus upload takes ~20s end-to-end; great for a "this is really being stored" feel, but you want `rememberBulk` for seeding and async `remember` for chat capture.
- Account creation needs the `AccountRegistry` object id, which the relayer's `/config` doesn't expose — we had to resolve it on-chain from the package's publish transaction.
- `@mysten/sui` v2.20 no longer exports `SuiClient` from `@mysten/sui/client`; the account helpers require you to pass a `SuiJsonRpcClient` yourself.

**What we'd build differently?** Track prediction *outcomes* (resolved/correct) as structured memory so the scorecard can show real accuracy, not just bias. Use `rememberBulk` everywhere, and explore `manual` mode to cut write latency. Possibly a multi-agent "war room" splitting stats / analysis / roast across namespaces sharing one source of truth.

## Demo video script (< 3:00)
- **0:00–0:20 — Hook.** "These are my World Cup takes — and they're on Walrus. Permanent. Verifiable. I can't delete the bad ones." Log a take live; click the **walrus blob** receipt; show it resolving on the aggregator.
- **0:20–0:50 — Day 1.** New handle. Ask GAFFER "who's winning it?" → generic answer. "It doesn't know me yet."
- **0:50–2:00 — The memory moment.** Switch to the seeded handle. Same question → GAFFER recalls the June 11 Brazil pick, roasts the Mbappé takes, holds you to "Morocco semis." Hit **Analyse my football brain** → bias profile.
- **2:00–2:35 — It's real, on mainnet.** Open the **on-chain account** link (Suiscan, mainnet) showing the MemWalAccount; open a blob receipt. "Try to delete a take. You can't."
- **2:35–3:00 — Close.** "GAFFER gets sharper every day of the tournament — because it remembers, on Walrus."

## Submission checklist
- [ ] Mainnet: `MEMWAL_NETWORK=mainnet pnpm setup:account` (fund wallet first)
- [ ] `SEED_HANDLE=gaffer-demo pnpm seed`
- [ ] Add `GLM_API_KEY`, verify chat + profile
- [ ] Deploy to Vercel (set env vars; delegate key is server-only)
- [ ] Push public GitHub repo
- [ ] Record < 3 min demo video
- [ ] File the GitHub feedback issues in `FEEDBACK.md` (MystenLabs/MemWal) — bonus prize
- [ ] Submit via Airtable form + DeepSurge page; join Walrus Discord; post with #Walrus on X
- [ ] Add referrer's Discord handle to the form (if referred)
