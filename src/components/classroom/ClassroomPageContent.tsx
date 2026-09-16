"use client";

import { handleSignIn } from "@/app/actions/auth";
import ClassroomBoardBeginnerPanel from "./ClassroomBeginnerPanel";

export default function ClassroomPageContent({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  if (!isAuthenticated) {
    return (
      <p className="mt-3 text-sm text-gray-600">
        <button
          type="button"
          onClick={() => handleSignIn()}
          className="brand-link cursor-pointer"
        >
          Log in
        </button>{" "}
        to view classroom.
      </p>
    );
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
