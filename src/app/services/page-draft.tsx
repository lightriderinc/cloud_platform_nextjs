import ServicesGrid from "@/components/services/ServicesGrid";

export default function ServicesPage() {
  return (
    <div className="animate-fade-in-up">
      <h1 className="text-2xl font-semibold text-gray-700">Services</h1>
      <p className="text-sm text-gray-600">
        Explore Light Rider&apos;s suite of quantum-powered services.
      </p>
      <ServicesGrid />
    </div>
  );
}
