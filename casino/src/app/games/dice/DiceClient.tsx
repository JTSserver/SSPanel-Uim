"use client";

import { useState, useTransition } from "react";

interface RoundResult {
  roundId: string;
  serverSeedHash: string;
  nonce: string;
  outcome: { roll: string; win: boolean; multiplier: string; winChance: string };
  payout: string;
  newBalance: string;
}

export default function DiceClient(props: {
  walletId: string;
  currency: string;
  initialBalance: string;
}) {
  const [bet, setBet] = useState("1.00");
  const [target, setTarget] = useState("50");
  const [side, setSide] = useState<"over" | "under">("over");
  const [clientSeed, setClientSeed] = useState(() => randomSeed());
  const [balance, setBalance] = useState(props.initialBalance);
  const [last, setLast] = useState<RoundResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function roll() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/games/dice", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            walletId: props.walletId,
            bet,
            clientSeed,
            params: { target, side },
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? `error ${res.status}`);
          return;
        }
        const data: RoundResult = await res.json();
        setLast(data);
        setBalance(data.newBalance);
      } catch (e) {
        setError(String(e));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-panel p-4 flex justify-between">
        <span className="text-white/60 text-sm">Balance</span>
        <span className="font-mono">
          {balance} {props.currency}
        </span>
      </div>

      <div className="rounded-lg bg-panel p-4 space-y-4">
        <Field label="Bet">
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={bet}
            onChange={(e) => setBet(e.target.value)}
            className="w-full bg-bg rounded px-3 py-2 font-mono"
          />
        </Field>

        <Field label={`Target (${side === "over" ? "roll above" : "roll below"})`}>
          <input
            type="number"
            min="0.01"
            max="99.99"
            step="0.01"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full bg-bg rounded px-3 py-2 font-mono"
          />
        </Field>

        <div className="flex gap-2">
          <button
            type="button"
            className={`flex-1 py-2 rounded ${side === "over" ? "bg-accent text-black" : "bg-bg"}`}
            onClick={() => setSide("over")}
          >
            Over
          </button>
          <button
            type="button"
            className={`flex-1 py-2 rounded ${side === "under" ? "bg-accent text-black" : "bg-bg"}`}
            onClick={() => setSide("under")}
          >
            Under
          </button>
        </div>

        <Field label="Client seed (you control)">
          <div className="flex gap-2">
            <input
              value={clientSeed}
              onChange={(e) => setClientSeed(e.target.value)}
              className="flex-1 bg-bg rounded px-3 py-2 font-mono text-sm"
            />
            <button
              type="button"
              className="px-3 bg-bg rounded text-sm"
              onClick={() => setClientSeed(randomSeed())}
            >
              ↻
            </button>
          </div>
        </Field>

        <button
          type="button"
          disabled={pending}
          onClick={roll}
          className="w-full py-3 rounded bg-accent text-black font-bold disabled:opacity-50"
        >
          {pending ? "Rolling…" : "Roll"}
        </button>

        {error && <div className="text-loss text-sm">{error}</div>}
      </div>

      {last && (
        <div className="rounded-lg bg-panel p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-white/60">Roll</span>
            <span className="font-mono text-2xl">{last.outcome.roll}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Result</span>
            <span className={last.outcome.win ? "text-win" : "text-loss"}>
              {last.outcome.win ? `Win × ${last.outcome.multiplier}` : "Loss"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Payout</span>
            <span className="font-mono">{last.payout}</span>
          </div>
          <details className="pt-2 text-xs text-white/50">
            <summary className="cursor-pointer">Provably-fair details</summary>
            <div className="mt-2 space-y-1 font-mono break-all">
              <div>round: {last.roundId}</div>
              <div>nonce: {last.nonce}</div>
              <div>server seed hash: {last.serverSeedHash}</div>
              <div>client seed: {clientSeed}</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-white/60">{label}</span>
      {children}
    </label>
  );
}

function randomSeed(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
