import PrivacyPolicy from "@/components/legal/PrivacyPolicy.mdx";

export const metadata = {
  title: "Privacy Policy | Light Rider Quantum",
};

export default function PrivacyPage() {
  return (
    <div className="animate-fade-in-up">
      <div className="bg-gray-50 p-10 default-radius">
        <PrivacyPolicy />
      </div>
    </div>
  );
}
