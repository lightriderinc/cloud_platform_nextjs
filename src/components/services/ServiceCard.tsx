import Image from "next/image";
import Link from "next/link";

import { MdArrowForward } from "react-icons/md";

interface ServiceCardProps {
  href: string;
  imageSrc: string;
  coloredImageSrc: string;
  imageAlt: string;
  title: string;
  providerName: string;
  description: string;
}

export default function ServiceCard({
  href,
  imageSrc,
  coloredImageSrc,
  imageAlt,
  title,
  providerName,
  description,
}: ServiceCardProps) {
  return (
    <>
      <Link href={href} className="flex group">
        <div className="flex h-full w-full cursor-pointer flex-col justify-between default-radius bg-gray-100 border border-gray-100 p-4 pt-5 card-hover-primary">
          <div>
            <div className="flex flex-col mb-3">
              <h2 className="text-lg font-bold">{title}</h2>
              <span className="text-sm text-gray-300">{providerName}</span>
            </div>
            <p className="text-sm text-gray-600">{description}</p>
          </div>

          <div className="flex flex-row justify-between items-end mt-8">
            <div className="w-10 h-10 flex items-end justify-center">
              <div className="relative">
                <Image
                  src={coloredImageSrc}
                  alt={imageAlt}
                  aria-hidden="true"
                  width={100}
                  height={250}
                  className="absolute inset-0 z-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                />
                <Image
                  src={imageSrc}
                  alt={imageAlt}
                  aria-hidden="true"
                  width={100}
                  height={250}
                  className="relative z-1 opacity-100 group-hover:opacity-0 transition-opacity duration-200"
                />
              </div>
            </div>
            <MdArrowForward className="text-xl text-gray-400 transition-colors duration-150 group-hover:text-[var(--brand-primary)]" />
          </div>
        </div>
      </Link>
    </>
  );
}
