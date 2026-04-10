import Image from "next/image";
import {Course} from "./coursesData";

export default function CourseCard(props: Course) {
  return(
    <article className="bridge-course-card">
      <a href={props.courseLink} className="flex flex-col items-center md:items-start p-4 bg-white dark:bg-slate-900 rounded-lg shadow hover:shadow-md transition-all duration-300 w-full cursor-pointer group border border-gray-100 dark:border-gray-800 text-center md:text-left">
        <Image src={props.imageSrc} alt={props.imageAlt} width={360} height ={120} className="rounded-md mb-3" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300">{props.title}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 flex-grow transition-all duration-300 hidden group-hover:block">{props.description}</p>
        <button className="mt-4 max-w-xs md:w-full bg-blue-600 text-white py-2 px-6 md:px-0 rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 cursor-pointer transition-colors duration-300 font-medium">
            Learn More
          </button>
      </a>
    </article>
  )
}