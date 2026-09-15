"use client";

import ExperimentsPageClient from "@/components/experiments/ExperimentsPageClient";
import InfoBox from "@/components/InfoBox";

export default function CepheusExperimentsTab({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  return (
    <div className="flex flex-col">
      <p className="max-w-2xl text-sm leading-relaxed text-gray-600 mb-3">
        Run a quantum experiment on Cepheus-1-108Q.
      </p>
      <div className="mb-8">
        <InfoBox>
          Experiments are specific use-cases tailored to the unique properties
          and topology of specific quantum backends. <br /> They are designed to
          help you explore the capabilities of the device and understand how to
          best utilize it for your applications. <br />
          <br />
          <span className="font-semibold text-blue-700">Note:</span> New
          experiments will become available over time.
        </InfoBox>
      </div>
      <ExperimentsPageClient isAuthenticated={isAuthenticated} />
    </div>
  );
}
