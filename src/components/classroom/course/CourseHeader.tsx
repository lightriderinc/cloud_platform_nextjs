import BackButton from "@/components/ui/BackButton";

export default function CourseHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-10">
      <BackButton href="/classroom" previousPageName={"Classroom"}/>
      <h1 className="text-2xl font-semibold text-gray-700">{title}</h1>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}
