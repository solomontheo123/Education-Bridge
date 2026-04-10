import CourseCard from "./courseCard";
import { courses } from "./coursesData";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-slate-900">
      <main className="w-full max-w-7xl px-6 py-12">
        <h1 className="text-5xl font-bold text-center sm:text-left mb-8">Welcome to Our Learning Platform</h1>
        <div id="course-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course) => (
            <CourseCard
              key={course.title}
              courseLink={course.courseLink}
              imageSrc={course.imageSrc}
              imageAlt={course.imageAlt}
              title={course.title}
              description={course.description}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
