"use client";

import { CreditsCheckoutButton } from "@/components/billing/CheckoutButtons";
import { useState } from "react";

const PRESETS = [50, 100, 250, 1000];

export default function CreditsTopUp() {
  const [amount, setAmount] = useState(100);
  const [customValue, setCustomValue] = useState("");

  function selectPreset(value: number) {
    setAmount(value);
    setCustomValue("");
  }

  function handleCustomChange(value: string) {
    setCustomValue(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) setAmount(parsed);
  }

  return (
    <div className="default-radius border border-gray-100 bg-gray-100 p-5">
      <h2 className="text-lg font-bold text-gray-800">Buy compute tokens</h2>
      <p className="mb-4 text-sm text-gray-600">
        Tokens are consumed at the runtime rates below as your jobs run.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => selectPreset(preset)}
            className={`px-3 py-1.5 bg-white default-radius text-sm font-medium border transition-colors cursor-pointer ${
              amount === preset && !customValue
                ? "border-[var(--brand-primary)] bg-red-50 text-[var(--brand-primary)]"
                : "border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            ${preset}
          </button>
        ))}
      </div>

      <label className="mb-4 block text-sm text-gray-600">
        Or enter a custom amount (USD)
        <input
          type="number"
          min={5}
          max={10000}
          value={customValue}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="e.g. 300"
          className="mt-1 w-full default-radius border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <CreditsCheckoutButton
        amountUsd={amount}
        label={`Buy $${amount} in tokens`}
        className="w-full default-radius bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
      />
    </div>
  );
}
