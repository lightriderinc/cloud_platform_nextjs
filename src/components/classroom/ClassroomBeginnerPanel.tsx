import { BiAtom } from "react-icons/bi";
import { FaSquareBinary } from "react-icons/fa6";
import ClassroomBoardCourseCard from "./ClassroomBoardCourseCard";

export default function ClassroomBoardBeginnerPanel() {
  return (
    <div className="flex flex-col gap-4 rounded bg-emerald-900 p-6 shadow-lg chalkboard-bg">
        <h3 className="text-3xl handwritten text-white mb-8">
          Begin your quantum computing journey!
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <ClassroomBoardCourseCard
            href="/classroom"
            icon={FaSquareBinary}
            title="Classical computing basics"
            description="Learn the fundamental ideas in classical computing."
            badges={["Bits", "Gates", "Boolean Algebra"]}
          />
          <ClassroomBoardCourseCard
            href="/classroom"
            icon={BiAtom}
            title="Quantum computing basics"
            description="Learn the very basics of quantum computing."
            badges={["Qubits", "Superposition", "Entanglement"]}
          />
        </div>
      </div>
  );
}
