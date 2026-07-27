"use client";

import { handleSignIn } from "@/app/actions/auth";

export default function JobsLoginPrompt() {
  return (
    <div className="flex flex-col items-center text-center justify-center p-12 border border-dashed border-gray-200 default-radius bg-gray-50">
      <div>
        <p className="mt-3 text-sm text-gray-600">
          Your submitted jobs appear here. <br />
          <button
            type="button"
            onClick={() => handleSignIn()}
            className="brand-link cursor-pointer"
          >
            Log in
          </button>{" "}
          to track your jobs.
        </p>
      </div>
    </div>
  );
}
