import Image from "next/image";
import { Course } from "./coursesData";

interface CourseDetailsProps {
  course: Course | null;
  onClose: () => void;
}

export default function CourseDetails({ course, onClose }: CourseDetailsProps) {
  if (!course) return null;

  return (
    <section className="mt-12 p-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
        {/* Course Image */}
        <div className="flex-shrink-0 md:w-96">
          <Image
            src={course.imageSrc}
            alt={course.imageAlt}
            width={400}
            height={300}
            className="rounded-lg shadow-md w-full h-auto object-cover"
          />
        </div>

        {/* Course Details */}
        <div className="flex-1">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {course.title}
          </h2>

          <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
            {course.description}
          </p>

          <div className="mb-6 space-y-3">
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Course Link:</span>{" "}
              {course.courseLink ? (
                <a
                  href={course.courseLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {course.courseLink}
                </a>
              ) : (
                <span>Coming soon</span>
              )}
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors duration-300 font-medium"
            >
              Close
            </button>
            {course.courseLink && course.courseLink !== "#" && (
              <a
                href={course.courseLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-300 font-medium"
              >
                Enroll Now
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
