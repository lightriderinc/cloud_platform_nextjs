"use client";

import { CreditsCheckoutButton } from "@/components/billing/CheckoutButtons";
import { useState } from "react";

const PRESETS = [5000, 10000, 25000, 100000];

const MIN_CREDITS = 500;
const MAX_CREDITS = 1000000;

// Fixed unit price: 1 credit = $0.01.
const CREDIT_PRICE_USD = 0.01;

export default function CreditsTopUp() {
  const [credits, setCredits] = useState(10000);
  const [customValue, setCustomValue] = useState("");

  const priceUsd = credits * CREDIT_PRICE_USD;
  const customCredits = customValue === "" ? null : Number(customValue);
  const isCustomOutOfRange =
    customCredits !== null &&
    (customCredits < MIN_CREDITS || customCredits > MAX_CREDITS);

  function selectPreset(value: number) {
    setCredits(value);
    setCustomValue("");
  }

  function handleCustomChange(value: string) {
    if (value !== "" && !/^\d+$/.test(value)) return;
    setCustomValue(value);
    const parsed = Number(value);
    if (
      Number.isInteger(parsed) &&
      parsed >= MIN_CREDITS &&
      parsed <= MAX_CREDITS
    ) {
      setCredits(parsed);
    }
  }

  return (
    <div className="default-radius border border-gray-100 bg-gray-100 p-5">
      <h2 className="text-lg font-bold text-gray-800">Buy compute credits</h2>
      <p className="mb-4 text-sm text-gray-600">
        Credits are consumed at the runtime rates below as your jobs run.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => selectPreset(preset)}
            className={`px-3 py-1.5 bg-white default-radius text-sm font-medium border transition-colors cursor-pointer ${
              credits === preset && !customValue
                ? "border-[var(--brand-primary)] bg-red-50 text-[var(--brand-primary)]"
                : "border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            {preset.toLocaleString()} credits
          </button>
        ))}
      </div>

      <label className="mb-1 block text-sm text-gray-600">
        Or enter a custom amount of credits
        <input
          type="number"
          min={MIN_CREDITS}
          max={MAX_CREDITS}
          step={1}
          value={customValue}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="e.g. 30000"
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
        Enter a value between 500-1,000,000
      </p>

      <p className="mb-4 text-sm text-gray-700">
        Total: <span className="font-medium">${priceUsd.toFixed(2)}</span>
      </p>

      <CreditsCheckoutButton
        amountUsd={priceUsd}
        label={`Buy ${credits.toLocaleString()} credits for $${priceUsd.toFixed(2)}`}
        disabled={isCustomOutOfRange}
      />
    </div>
  );
}
