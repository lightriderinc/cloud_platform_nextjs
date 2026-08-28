import ServiceCard from "./ServiceCard";

export default function ServicesGrid() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 mt-12">
        <ServiceCard
          href="#"
          imageSrc="/services/Eaas-vis.svg"
          coloredImageSrc="/services/Eaas-vis-colored.svg"
          imageAlt="Entropy as a Service visual"
          title="Entropy Management Service (EMS)"
          providerName="Light Rider Inc."
          description="Quantum-derived entropy for secure communications, cryptographic workflows, AI training data, and randomness-dependent applications."
        />
        <ServiceCard
          href="/services/qec"
          imageSrc="/services/QEC-vis.svg"
          coloredImageSrc="/services/QEC-vis-colored.svg"
          imageAlt="Entropy as a Service visual"
          title="Quantum Error Correction (QEC)"
          providerName="Light Rider Inc."
          description="Real-time quantum error correction to stabilize noisy hardware and enable fault-tolerant computation."
        />
      </div>
    </>
  );
}
