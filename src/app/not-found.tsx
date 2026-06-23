export default function NotFound() {
  return (
    <div className="flex mt-5 flex-col items-center justify-center gap-4">
      <div className="flex flex-col items-center justify-center gap-1">
        <h1 style={{ fontSize: "10rem" }} className="text-brand-gradient">404</h1>
        <h1>Page not found</h1>
      </div>

      <p>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
    </div>
  );
}
