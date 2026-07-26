export default function NotAuthorized() {
  return (
    <div className="flex mt-5 flex-col items-center justify-center gap-4">
      <div className="flex flex-col items-center justify-center gap-1">
        <h1 style={{ fontSize: "10rem" }} className="text-brand-gradient">
          401
        </h1>
        <h1>Access denied</h1>
      </div>

      <p>
        You don&apos;t have permission to access this page. <br />
        Please contact your administrator if you believe this is an error.
      </p>
    </div>
  );
}
