import ClassicalComputingCourse from "@/components/classroom/classical-computing/ClassicalComputingCourse";
import ClassroomSignInPrompt from "@/components/classroom/course/ClassroomSignInPrompt";
import { getSession } from "@/lib/auth/session";

export default async function ClassicalComputingBasicsPage() {
  const { isAuthenticated } = await getSession();

  if (!isAuthenticated) {
    return (
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-semibold text-gray-700">
          Classical computing basics
        </h1>
        <ClassroomSignInPrompt label="this course" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <ClassicalComputingCourse />
    </div>
  );
}
