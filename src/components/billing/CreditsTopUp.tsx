"use client";

import { CreditsCheckoutButton } from "@/components/billing/CheckoutButtons";
import { useState } from "react";

const PRESETS = [50, 100, 250, 1000];

const MIN_TOKENS = 5;
const MAX_TOKENS = 10000;

// Price of a single token in USD. E.g. 1.5 means 1 token costs $1.50.
const TOKEN_PRICE_USD = 1.0;

export default function CreditsTopUp() {
  const [tokens, setTokens] = useState(100);
  const [customValue, setCustomValue] = useState("");

  const priceUsd = tokens * TOKEN_PRICE_USD;
  const customTokens = customValue === "" ? null : Number(customValue);
  const isCustomOutOfRange =
    customTokens !== null &&
    (customTokens < MIN_TOKENS || customTokens > MAX_TOKENS);

  function selectPreset(value: number) {
    setTokens(value);
    setCustomValue("");
  }

  function handleCustomChange(value: string) {
    if (value !== "" && !/^\d+$/.test(value)) return;
    setCustomValue(value);
    const parsed = Number(value);
    if (
      Number.isInteger(parsed) &&
      parsed >= MIN_TOKENS &&
      parsed <= MAX_TOKENS
    ) {
      setTokens(parsed);
    }
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
              tokens === preset && !customValue
                ? "border-[var(--brand-primary)] bg-red-50 text-[var(--brand-primary)]"
                : "border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            {preset} tokens
          </button>
        ))}
      </div>

      <label className="mb-1 block text-sm text-gray-600">
        Or enter a custom amount of tokens
        <input
          type="number"
          min={MIN_TOKENS}
          max={MAX_TOKENS}
          step={1}
          value={customValue}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="e.g. 300"
          className={`mt-1 w-full default-radius border px-3 py-2 text-sm ${
            isCustomOutOfRange ? "border-red-400" : "border-gray-300"
          }`}
        />
      </label>
      <p
        className={`mb-4 text-xs ${
          isCustomOutOfRange ? "text-red-600" : "text-gray-500"
        }`}
      >
        Enter a value between 5-10,000
      </p>

      <p className="mb-4 text-sm text-gray-700">
        Total: <span className="font-medium">${priceUsd.toFixed(2)}</span>
      </p>

      <CreditsCheckoutButton
        amountUsd={priceUsd}
        label={`Buy ${tokens} tokens for $${priceUsd.toFixed(2)}`}
        disabled={isCustomOutOfRange}
      />
    </div>
  );
}
