"use client";

import { handleSignIn } from "@/app/actions/auth";

export default function ClassroomSignInPrompt({
  label = "classroom",
}: {
  label?: string;
}) {
  return (
    <p className="mt-3 text-sm text-gray-600">
      <button
        type="button"
        onClick={() => handleSignIn()}
        className="brand-link cursor-pointer"
      >
        Log in
      </button>{" "}
      to view {label}.
    </p>
  );
}
