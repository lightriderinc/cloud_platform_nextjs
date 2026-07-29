"use client";

import { useQuery } from "@tanstack/react-query";
import { ManageBillingButton } from "./CheckoutButtons";

type PaymentMethod =
  | {
      type: "card";
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
    }
  | { type: "link"; email: string | null };

async function fetchPaymentMethod(): Promise<PaymentMethod | null> {
  const res = await fetch("/api/billing/payment-method");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.paymentMethod;
}

function formatBrand(brand: string): string {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function describe(paymentMethod: PaymentMethod): string {
  if (paymentMethod.type === "card") {
    return `${formatBrand(paymentMethod.brand)} ending in ${paymentMethod.last4} · expires ${String(
      paymentMethod.expMonth,
    ).padStart(2, "0")}/${paymentMethod.expYear}`;
  }
  return paymentMethod.email
    ? `Stripe Link (${paymentMethod.email})`
    : "Stripe Link";
}

export default function PaymentMethodCard() {
  const { data: paymentMethod, error } = useQuery({
    queryKey: ["billing", "payment-method"],
    queryFn: fetchPaymentMethod,
  });

  return (
    <div className="default-radius border border-gray-50 bg-gray-50 p-4">
      <h2 className="mb-2 text-sm font-medium text-gray-800">Payment method</h2>
      {error ? (
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : "Something went wrong."}
        </p>
      ) : paymentMethod === undefined ? (
        <div className="h-3 bg-gray-200 w-full rounded animate-pulse"></div>
      ) : paymentMethod ? (
        <p className="text-sm text-gray-600">{describe(paymentMethod)}</p>
      ) : (
        <p className="text-sm text-gray-500">No payment method on file.</p>
      )}

      <p className="text-sm text-gray-600">
        Update your payment method, view invoices, or change plans in the
        billing portal.
      </p>
      <div className="flex">
        <ManageBillingButton />
      </div>
    </div>
  );
}
