"use client";

import ExperimentsPageClient from "@/components/experiments/ExperimentsPageClient";

export default function CepheusExperimentsTab({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-2xl text-sm leading-relaxed text-gray-600">
        Run a quantum experiment on Cepheus-1-108Q.
      </p>
      <ExperimentsPageClient isAuthenticated={isAuthenticated} />
    </div>
  );
}
