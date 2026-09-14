import ExperimentsPageClientSkeleton from "@/components/experiments/ExperimentsPageClientSkeleton";

// Placeholder shown while Cepheus's backend data is still loading. Markup
// mirrors CepheusExperimentsTab's description + InfoBox, plus
// ExperimentsPageClientSkeleton for the experiment dropdown underneath --
// kept separate from any individual experiment's own skeleton (e.g.
// QEntropyExperimentSkeleton), since which experiment is even selected
// isn't known yet at this point.
export default function CepheusExperimentsTabSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="mb-3 flex max-w-2xl flex-col gap-2">
        <div className="h-3.5 w-full rounded bg-gray-100" />
        <div className="h-3.5 w-1/3 rounded bg-gray-100" />
      </div>
      <div className="mb-8 h-28 w-full rounded default-radius bg-gray-100" />
      <ExperimentsPageClientSkeleton />
    </div>
  );
}
