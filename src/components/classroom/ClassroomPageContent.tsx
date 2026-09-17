"use client";

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
      <h2 className="text-xl font-bold text-gray-600 mb-4">
        For beginners
      </h2>
      <ClassroomBoardBeginnerPanel />
    </div>
  );
}
