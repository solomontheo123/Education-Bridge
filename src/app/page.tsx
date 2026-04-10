import CourseCard from "./courseCard";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-5xl font-bold text-center sm:text-left">Welcome to Our Learning Platform</h1>
        <div id="course-cards" className="mt-16 w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full grid">
          <CourseCard
            imageSrc="/course1.webp"
            imageAlt="Course 1"
            title="Software Engineering (The Builder Path)"
            description="Learn the fundamentals of software engineering and build real-world applications."
          />
          <CourseCard
            imageSrc="/course2.webp"
            imageAlt="Course 2"
            title="Data Science & AI (The Predictor Path)"
            description="Master data analysis and machine learning to make informed predictions and decisions."
          />
          <CourseCard
            imageSrc="/course3.webp"
            imageAlt="Course 3"
            title="Digital Literacy & Global Jobs (The Foundation Path)"
            description="Gain essential digital skills and explore global job opportunities in the tech industry."
          />  
          <CourseCard
            imageSrc="/course4.webp"
            imageAlt="Course 4"
            title="Sustainable Agriculture & AgriTech (The Growth Path)"
            description="Learn about sustainable farming practices and the latest technologies in agriculture."
          />
          <CourseCard
            imageSrc="/course5.webp"
            imageAlt="Course 5"
            title="Cybersecurity"
            description="Learn how to protect systems and data from cyber threats."
          />
          <CourseCard
            imageSrc="/course6.webp"
            imageAlt="Course 6"
            title="Cloud Computing"
            description="Explore cloud services and architecture for modern applications."
          />  
        </div>
      </main>
    </div>
  );
}
