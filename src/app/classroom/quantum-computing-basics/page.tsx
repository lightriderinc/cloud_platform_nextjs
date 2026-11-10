import SignInRequired from "@/components/auth/SignInRequired";
import QuantumComputingCourse from "@/components/classroom/quantum-computing/QuantumComputingCourse";
import { getSession } from "@/lib/auth/session";

export const metadata = {
  title: "Quantum Computing Basics | Light Rider Quantum",
};

export default async function QuantumComputingBasicsPage() {
  const { isAuthenticated } = await getSession();

  if (!isAuthenticated) {
    return (
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-semibold text-gray-700">
          Quantum computing basics
        </h1>
        <div className="mt-6">
          <SignInRequired target="this course" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <QuantumComputingCourse />
    </div>
  );
}
