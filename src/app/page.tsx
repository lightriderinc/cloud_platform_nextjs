import Image from "next/image";


export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <main className="flex flex-1 w-full gap-5 flex-col items-center  py-32 px-16">
        <Image
          className="mb-5"
          src="/Lightrider-centered-priamry.svg"
          alt="Next.js logo"
          width={500}
          height={1000}
          priority
        />
        <h1>This page is under construction</h1>
      </main>
    </div>
  );
}
