"use client";

import Link from "next/link";
import { FaChalkboardTeacher } from "react-icons/fa";

export default function DashboardClassroomLink() {

  return (
    <>
      <Link href="/classroom" className="flex w-full cursor-pointer">
        <div className="flex flex-col h-full w-full bg-gray-100 p-5 border border-gray-100 default-radius card-hover-primary gap-3">
          <FaChalkboardTeacher className="text-5xl text-gray-200" />
          <h3 className="flex text-left gap-1 text-md font-medium">
            Visit classroom
          </h3>
          <div className="flex text-left">
            <p className="text-sm text-gray-500">
              Explore courses and learning materials to help you get started with quantum computing.
            </p>
          </div>
        </div>
      </Link>

    </>
  );
}
