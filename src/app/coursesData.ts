export interface Course {
  courseLink?: string;
  imageSrc: string;
  imageAlt: string;
  title: string;
  description: string;
}

export const courses: Course[] = [
  {
    courseLink: "#",
    imageSrc: "/course1.webp",
    imageAlt: "Course 1",
    title: "Software Engineering (The Builder Path)",
    description: "Learn the fundamentals of software engineering and build real-world applications."
  },
  {
    courseLink: "#",
    imageSrc: "/course2.webp",
    imageAlt: "Course 2",
    title: "Data Science & AI (The Predictor Path)",
    description: "Master data analysis and machine learning to make informed predictions and decisions."
  },
  {
    courseLink: "#",
    imageSrc: "/course3.webp",
    imageAlt: "Course 3",
    title: "Digital Literacy & Global Jobs (The Foundation Path)",
    description: "Gain essential digital skills and explore global job opportunities in the tech industry."
  },
  {
    courseLink: "#",
    imageSrc: "/course4.webp",
    imageAlt: "Course 4",
    title: "Sustainable Agriculture & AgriTech (The Growth Path)",
    description: "Learn about sustainable farming practices and the latest technologies in agriculture."
  },
  {
    courseLink: "#",
    imageSrc: "/course5.webp",
    imageAlt: "Course 5",
    title: "Cybersecurity",
    description: "Learn how to protect systems and data from cyber threats."
  },
  {
    courseLink: "#",
    imageSrc: "/course6.webp",
    imageAlt: "Course 6",
    title: "Cloud Computing",
    description: "Explore cloud services and architecture for modern applications."
  }
];