"use client";

import { useState } from "react";
import Image from "next/image";
import CourseCard from "./courseCard";
import { courses, Course } from "./coursesData";

export default function Home() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  function handleCourseClick(course: Course) {
    setSelectedCourse(course);
  }

  function handleCloseDetails() {
    setSelectedCourse(null);
  }
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-slate-900">
      <main className="w-full max-w-7xl px-6 py-12">
        <h1 className="text-5xl font-bold text-center sm:text-left mb-8">Welcome to Our Learning Platform</h1>
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Courses Grid */}
          <div id="course-cards" className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.title}
                course={course}
                onSelectCourse={handleCourseClick}
              />
            ))}
          </div>

          {/* Course Details Sidebar - Only renders when a course is selected on lg screens */}
          {selectedCourse && (
            <div className="hidden lg:block w-96 sticky top-12 h-fit">
              <div className="p-4 md:p-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Course Image */}
                <div className="mb-4 -mx-6 -mt-6">
                  <Image
                    src={selectedCourse.imageSrc}
                    alt={selectedCourse.imageAlt}
                    width={384}
                    height={200}
                    className="w-full h-48 object-cover"
                  />
                </div>

                {/* Course Title */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  {selectedCourse.title}
                </h2>

                {/* Course Description */}
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                  {selectedCourse.description}
                </p>

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-600 my-4"></div>

                {/* AI Syllabus Section */}
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border-l-4 border-blue-600">
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase">Coming Soon</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    AI-generated syllabus data will appear here.
                  </p>
                </div>

                {/* Course Link */}
                {selectedCourse.courseLink && selectedCourse.courseLink !== "#" && (
                  <a
                    href={selectedCourse.courseLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full mb-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-300 font-medium text-center"
                  >
                    Enroll Now
                  </a>
                )}

                {/* Close Button */}
                <button
                  onClick={handleCloseDetails}
                  className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
