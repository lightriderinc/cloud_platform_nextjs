"use client";

import { CreditsCheckoutButton } from "@/components/billing/CheckoutButtons";
import {
  fetchJson,
  formatCredits,
  type Credits,
} from "@/components/billing/CreditsSummary";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const PRESETS = [5000, 10000, 25000, 100000];

const MIN_CREDITS = 500;
const MAX_CREDITS = 1000000;

// Fixed unit price: 1 credit = $0.01.
const CREDIT_PRICE_USD = 0.01;

export default function CreditsTopUp() {
  const [credits, setCredits] = useState(10000);
  const [customValue, setCustomValue] = useState("");

  const balance = useQuery({
    queryKey: ["billing", "credits"],
    queryFn: () => fetchJson<Credits>("/api/billing/credits"),
  });

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
    <div className="flex-1 default-radius border border-gray-50 bg-gray-50 p-5">
      <div className="flex flex-row justify-between items-end">
        <h2 className="text-lg font-bold text-gray-800">Buy compute credits</h2>
        <div className="inline-flex">
          <span className="text-sm">
            Current balance:
          </span>
          {balance.isLoading ? (
            <span className="ml-1 h-5 w-20 animate-pulse rounded bg-gray-200" />
          ) : (
            <span className="ml-1 text-sm font-medium">
              {balance.data
                ? `${formatCredits(balance.data.remainingCents)} credits`
                : "—"}
            </span>
          )}
        </div>
      </div>
      {/* <p className="mb-6 text-sm text-gray-600">
        Credits are consumed at the runtime rates below as your jobs run.
      </p> */}
      <div className="my-8">
        <span className="mb-2 block text-sm font-medium text-gray-600">
          Choose an amount
        </span>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => selectPreset(preset)}
              className={`pl-3 px-6 py-3 default-radius text-md font-medium border transition-colors cursor-pointer ${
                credits === preset && !customValue
                  ? "border-[var(--brand-primary)] bg-red-50 text-[var(--brand-primary)]"
                  : "border-gray-100 bg-white text-gray-600 hover:border-[var(--brand-primary)]"
              }`}
            >
              <div className="flex flex-col items-start">
                <span className="text-lg">{preset.toLocaleString()}</span>

                <span className="text-xs opacity-75 mb-4">Credits</span>
                <span className="text-sm">
                  ${(preset * CREDIT_PRICE_USD).toFixed(2)}
                </span>
              </div>
            </button>
          ))}
        </div>

        <label className="mb-1 block text-sm text-gray-600">
          Custom amount
          <div className="relative mt-1">
            <input
              type="number"
              min={MIN_CREDITS}
              max={MAX_CREDITS}
              step={1}
              value={customValue}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="e.g. 30000"
              className={`w-full default-radius border py-2 pl-3 pr-16 text-sm ${
                isCustomOutOfRange ? "border-red-400" : "border-gray-300"
              }`}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-gray-500">
              Credits
            </span>
          </div>
        </label>
        <span
          className={`mb-4 text-xs ${
            isCustomOutOfRange ? "text-red-600" : "text-gray-500"
          }`}
        >
          Enter a value between 500-1,000,000
        </span>
      </div>

      <div className="flex flex-col bg-gray-100 my-4 p-3">
        <span className="text-sm font-medium mb-4 text-gray-300">Summary</span>
        <div className="flex flex-col gap-1 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Credits</span>
            <span className="text-sm font-medium text-gray-500">
              {credits.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Price per credit</span>
            <span className="text-sm font-medium text-gray-500">
              ${CREDIT_PRICE_USD}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Total</span>
            <span className="text-lg font-medium text-gray-800">
              ${priceUsd.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <CreditsCheckoutButton
        amountUsd={priceUsd}
        label={`Buy for $${priceUsd.toFixed(2)}`}
        disabled={isCustomOutOfRange}
      />
    </div>
  );
}
