"use client";

import { useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import CourseCard from "./courseCard";
import { courses, Course } from "./coursesData";

export default function Home() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter courses based on search query
  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        
        {/* Search Bar */}
        <div className="mb-12 w-full">
          <div className="relative w-full">
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-6 h-6 pointer-events-none" />
            <input
              type="text"
              placeholder="Search courses by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 px-6 py-4 pl-16 text-base text-gray-900 dark:text-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:shadow-lg focus:shadow-blue-200 dark:focus:shadow-blue-900/50 transition-all duration-300 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Courses Grid or No Results Message */}
          <div id="course-cards" className="flex-1">
            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course.title}
                    course={course}
                    onSelectCourse={handleCourseClick}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="text-center">
                  <Search className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    No courses found
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    No courses found for {searchQuery}. Try another path.
                  </p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-300 font-medium"
                  >
                    Clear Search
                  </button>
                </div>
              </div>
            )}
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
