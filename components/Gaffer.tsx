"use client";

import { useCallback, useEffect, useState } from "react";
import { getTakes, type TakesPayload, type Receipt } from "@/app/actions";
import Composer from "./Composer";
import Chat from "./Chat";
import Record from "./Record";
import Feed from "./Feed";

type Tab = "feed" | "coach" | "record";

interface Props {
  provisioned: boolean;
  hasModel: boolean;
  accountUrl: string | null;
  network: string;
}

export default function Gaffer({ provisioned, hasModel, accountUrl, network }: Props) {
  const [handle, setHandle] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [data, setData] = useState<TakesPayload | null>(null);
  const [toast, setToast] = useState<Receipt | null>(null);
  const [tab, setTab] = useState<Tab>("feed");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("gaffer:handle") : null;
    if (saved) setHandle(saved);
  }, []);

  const reload = useCallback(async () => {
    if (!handle) return;
    try {
      setData(await getTakes(handle));
    } catch {
      /* memory may be warming up */
    }
  }, [handle]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  function commitHandle(h: string) {
    const clean = h.trim().replace(/^@/, "");
    if (!clean) return;
    localStorage.setItem("gaffer:handle", clean);
    setHandle(clean);
  }

  function onLogged(r: Receipt) {
    setToast(r);
    reload();
  }

  if (!provisioned) return <SetupScreen />;

  if (!handle) {
    return (
      <Landing
        draft={draft}
        setDraft={setDraft}
        onStart={() => commitHandle(draft)}
        network={network}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-5 sm:px-6">
      <Header
        handle={handle}
        network={network}
        accountUrl={accountUrl}
        onSwitch={() => {
          localStorage.removeItem("gaffer:handle");
          setHandle(null);
          setData(null);
        }}
      />

      {!hasModel && (
        <div className="mb-4 rounded-xl border border-[var(--lime)]/40 bg-[var(--lime)]/10 px-4 py-3 text-sm text-[var(--lime)]">
          Memory is live on {network}. Add <code className="font-mono">GLM_API_KEY</code> to{" "}
          <code className="font-mono">.env.local</code> and restart to wake GAFFER&apos;s voice.
        </div>
      )}

      <nav className="mb-4 flex gap-1.5">
        <TabButton active={tab === "feed"} onClick={() => setTab("feed")}>
          ⚽ Matches
        </TabButton>
        <TabButton active={tab === "coach"} onClick={() => setTab("coach")}>
          💬 Talk to GAFFER
        </TabButton>
        <TabButton active={tab === "record"} onClick={() => setTab("record")}>
          🧠 Your record{data ? ` (${data.takes.length})` : ""}
        </TabButton>
      </nav>

      {tab === "feed" && (
        <div className="mx-auto flex w-full max-w-xl min-h-0 flex-1 flex-col">
          <Feed handle={handle} takes={data?.takes ?? []} onReload={reload} />
        </div>
      )}

      {tab === "coach" && (
        <div className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col gap-5">
          <Composer handle={handle} onLogged={onLogged} />
          <Chat handle={handle} hasModel={hasModel} onActivity={reload} />
        </div>
      )}

      {tab === "record" && (
        <div className="mx-auto w-full max-w-2xl">
          <Record data={data} handle={handle} hasModel={hasModel} onReload={reload} />
        </div>
      )}

      {toast && <ReceiptToast receipt={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function Header({
  handle,
  network,
  accountUrl,
  onSwitch,
}: {
  handle: string;
  network: string;
  accountUrl: string | null;
  onSwitch: () => void;
}) {
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--lime)] text-lg font-black text-black">
          🦭
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight">
            GAFFER
            <span className="ml-2 align-middle text-xs font-medium text-[var(--muted)]">
              your World Cup take-keeper
            </span>
          </h1>
          <p className="text-xs text-[var(--muted)]">
            Receipts you can&apos;t delete · powered by Walrus Memory
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 font-mono text-[var(--muted)]">
          {network}
        </span>
        {accountUrl && (
          <a
            href={accountUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-[var(--muted)] hover:text-[var(--lime)]"
          >
            on-chain account ↗
          </a>
        )}
        <button
          onClick={onSwitch}
          className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-[var(--muted)] hover:text-white"
          title="Switch handle"
        >
          @{handle}
        </button>
      </div>
    </header>
  );
}

function Landing({
  draft,
  setDraft,
  onStart,
  network,
}: {
  draft: string;
  setDraft: (s: string) => void;
  onStart: () => void;
  network: string;
}) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md animate-pop">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--lime)] text-3xl">
            🦭
          </div>
          <h1 className="text-4xl font-black tracking-tight">GAFFER</h1>
          <p className="mt-2 text-[var(--muted)]">
            The AI pundit that remembers every prediction, opinion and reaction
            you give it across the 2026 World Cup — and keeps the receipts on
            Walrus. <span className="text-[var(--lime)]">No deleting your bad takes.</span>
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <label className="mb-2 block text-sm font-semibold">Pick a handle</label>
          <div className="flex gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onStart()}
              placeholder="@yourname"
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 outline-none focus:border-[var(--lime)]"
            />
            <button
              onClick={onStart}
              className="rounded-xl bg-[var(--lime)] px-4 py-2.5 font-bold text-black transition hover:brightness-95"
            >
              Enter
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Your takes are scoped to this handle&apos;s memory namespace on {network}.
            Pick a fresh one to start clean.
          </p>
        </div>
      </div>
    </div>
  );
}

function ReceiptToast({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 animate-pop rounded-xl border border-[var(--lime)]/50 bg-[var(--panel)] p-4 shadow-2xl">
      <div className="flex items-start justify-between">
        <div className="text-sm font-bold text-[var(--lime)]">📌 On the record</div>
        <button onClick={onClose} className="text-[var(--muted)] hover:text-white">
          ✕
        </button>
      </div>
      <p className="mt-1 line-clamp-2 text-sm">{receipt.text}</p>
      <a
        href={receipt.url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 block truncate font-mono text-xs text-[var(--muted)] hover:text-[var(--lime)]"
        title={receipt.blobId}
      >
        walrus blob {receipt.blobId.slice(0, 16)}… ↗
      </a>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3.5 py-2 text-sm font-bold transition ${
        active
          ? "border-[var(--lime)] bg-[var(--lime)] text-black"
          : "border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function SetupScreen() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6">
        <div className="mb-3 text-3xl">🦭</div>
        <h1 className="mb-2 text-2xl font-black">GAFFER needs a memory</h1>
        <p className="mb-4 text-[var(--muted)]">
          Walrus Memory isn&apos;t provisioned yet. Run the one-shot setup to
          create a free testnet account and write credentials to{" "}
          <code className="font-mono">.env.local</code>:
        </p>
        <pre className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3 font-mono text-sm text-[var(--lime)]">
          pnpm setup:account
        </pre>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Then add <code className="font-mono">GLM_API_KEY</code> and restart{" "}
          <code className="font-mono">pnpm dev</code>.
        </p>
      </div>
    </div>
  );
}
