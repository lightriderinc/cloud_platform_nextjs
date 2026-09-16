"use client";

import ClassroomSignInPrompt from "./course/ClassroomSignInPrompt";
import ClassroomBoardBeginnerPanel from "./ClassroomBeginnerPanel";

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
        Beginner learning materials
      </h2>
      <ClassroomBoardBeginnerPanel />
    </div>
  );
}
