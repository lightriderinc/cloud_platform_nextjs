import TermsOfUse from "@/components/legal/TermsOfUse.mdx";

export const metadata = {
  title: "Terms of Use | Light Rider Quantum",
};

export default function TermsPage() {
  return (
    <div className="animate-fade-in-up">
      <div className="bg-gray-50 p-10 default-radius">
        <TermsOfUse />
      </div>
    </div>
  );
}
