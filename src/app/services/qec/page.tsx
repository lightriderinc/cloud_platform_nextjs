import BackButton from "@/components/ui/BackButton";

export default function QECServicePage() {
  return (
    <>
      <div className="animate-fade-in-up">
        <BackButton href="/services" previousPageName="Services" />
        <h1 className="text-2xl font-semibold text-gray-700">
          Quantum Error Correction (QEC)
        </h1>
        <p className="text-sm text-gray-600">Light Rider Inc.</p>
      </div>
    </>
  );
}
