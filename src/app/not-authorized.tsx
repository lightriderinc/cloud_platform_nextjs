import Link from "next/link";

export default function NotAuthorized() {
  return (
    <div className="flex mt-5 flex-col items-center justify-center gap-4">
      <div className="flex flex-col items-center justify-center gap-1">
        <h1 style={{ fontSize: "10rem" }} className="text-brand-gradient">
          401
        </h1>
        <h1>Access denied</h1>
      </div>

      <p className="text-center mb-3">
        You don&apos;t have permission to access this page. <br />
        Please contact your administrator if you believe this is an error.
      </p>
      <Link href="/">
        <button
          type="button"
          className="default-radius px-3 py-2 text-sm font-semibold text-brand-primary cursor-pointer btn-outline-brand transition-opacity min-w-[110px] w-full"
        >
          Take me back home
        </button>
      </Link>
    </div>
  );
}
