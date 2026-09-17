import ClassroomPageContent from "@/components/classroom/ClassroomPageContent";
import { getSession } from "@/lib/auth/session";

export default async function ClassroomPage() {
  const { isAuthenticated } = await getSession();

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-2xl font-semibold text-gray-700">Classroom</h1>
      <p className="mb-12 text-sm text-gray-600">
        Learn quantum computing and explore the Light Rider platform with our
        interactive tutorials and lessons.
      </p>
      <ClassroomPageContent isAuthenticated={isAuthenticated} />
    </div>
  );
}
