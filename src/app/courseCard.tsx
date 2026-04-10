import Image from "next/image";

export default function CourseCard(props: {
  imageSrc: string;
  imageAlt: string;
  title: string;
  description: string;
}) {
  return(
    <article className="bridge-course-card">
      <button className="flex flex-col items-start p-4 bg-blue-900 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 w-full cursor-pointer">
        <Image src={props.imageSrc} alt={props.imageAlt} width={360} height ={120} />
        <h2>{props.title}</h2>
        <p>{props.description}</p>
        <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 cursor-pointer transition-colors duration-300">
            Learn More
          </button>
      </button>
    </article>
  )
}