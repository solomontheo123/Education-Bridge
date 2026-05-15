import { useState } from "react";
import Image from "next/image";
import { Course } from "./coursesData";

interface CourseCardProps {
  course: Course;
  onSelectCourse: (course: Course) => void;
}

export default function CourseCard({ course, onSelectCourse }: CourseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLearnMore = () => {
    setIsExpanded(!isExpanded);
    onSelectCourse(course);
  };

  return (
    <article className="bridge-course-card">
      <div className={`flex flex-col items-center md:items-start p-4 bg-white dark:bg-slate-900 rounded-lg shadow hover:shadow-xl transition-all duration-300 w-full cursor-pointer group border border-gray-100 dark:border-gray-800 text-center md:text-left ${!isExpanded && 'hover:scale-105'} hover:border-blue-300 dark:hover:border-blue-600 ${isExpanded ? 'lg:hover:scale-100' : ''}`}>
        {/* Main Card Content */}
        <Image
          src={course.imageSrc}
          alt={course.imageAlt}
          width={360}
          height={120}
          loading="eager"
          className="rounded-md mb-3 w-full h-auto"
        />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-bridge-blue dark:group-hover:text-bridge-blue transition-colors duration-300">
          {course.title}
        </h2>
        <p className={`text-sm text-gray-600 dark:text-gray-300 mt-2 flex-grow transition-all duration-300 hidden ${!isExpanded && 'group-hover:block'}`}>
          {course.description}
        </p>

        {/* Expanded Details - Show on md and smaller screens */}
        {isExpanded && (
          <div className="lg:hidden w-full mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              {course.description}
            </p>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-600 my-3"></div>

            {/* AI Syllabus Section */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border-l-4 border-bridge-blue">
              <p className="text-xs font-semibold text-bridge-blue dark:text-bridge-blue uppercase">Coming Soon</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                AI-generated syllabus data will appear here.
              </p>
            </div>

            {/* Enroll Button */}
            {course.courseLink && course.courseLink !== "#" && (
              <a
                href={course.courseLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-2 bg-bridge-blue text-white rounded-md hover:bg-bridge-blue-dark dark:bg-bridge-blue-dark dark:hover:bg-bridge-blue transition-colors duration-300 font-medium text-center text-sm"
              >
                Enroll Now
              </a>
            )}
          </div>
        )}

        {/* Button - Always at the end */}
        <button
          onClick={handleLearnMore}
          className="mt-4 max-w-xs md:w-full bg-bridge-blue text-white py-2 px-6 md:px-0 rounded-md hover:bg-bridge-blue-dark dark:bg-bridge-blue-dark dark:hover:bg-bridge-blue cursor-pointer transition-colors duration-300 font-medium w-full"
        >
          {isExpanded ? 'View Less' : 'Learn More'}
        </button>
      </div>
    </article>
  );
}