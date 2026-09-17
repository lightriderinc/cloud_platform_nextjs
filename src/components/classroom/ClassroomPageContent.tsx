"use client";

import { RiGraduationCapFill } from "react-icons/ri";
import ClassroomBoardBeginnerPanel from "./ClassroomBeginnerPanel";
import ClassroomSignInPrompt from "./course/ClassroomSignInPrompt";

export default function ClassroomPageContent({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  if (!isAuthenticated) {
    return <ClassroomSignInPrompt />;
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-600 mb-4">For beginners</h2>
        <ClassroomBoardBeginnerPanel />
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-600 mb-4">
          Beyond the basics
        </h2>

        <div className="default-radius flex flex-col items-center justify-center border border-dashed border-gray-200 p-8 text-center">
          <div className="mb-3 flex items-center justify-center text-6xl text-gray-200">
            <RiGraduationCapFill />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Coming soon
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            More advanced courses are on the way.
          </p>
        </div>
      </div>
    </div>
  );
}
