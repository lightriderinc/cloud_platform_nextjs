import { logtoConfig } from "@/app/logto";
import LogoutButton from "@/components/auth/LogoutButton";
import { getLogtoContext, signOut } from "@logto/next/server-actions";
import { redirect } from "next/navigation";

// Minimal profile page: shows the signed-in account's details and hosts the
// log out button. Signed-out visitors are bounced to the dashboard.
export default async function ProfilePage() {
  const { isAuthenticated, claims } = await getLogtoContext(logtoConfig);

  if (!isAuthenticated) {
    redirect("/");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Profile</h1>
      <p className="mb-8 text-sm text-gray-600">
        Your Light Rider account details.
      </p>

      <div className="mb-8 max-w-md default-radius border border-gray-200 bg-gray-100 p-4">
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-xs text-gray-500">Username</dt>
            <dd className="text-gray-700">
              {claims?.username ?? claims?.name ?? "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Email</dt>
            <dd className="text-gray-700">{claims?.email ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">User ID</dt>
            <dd className="font-mono text-xs text-gray-700">{claims?.sub}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Name</dt>
            <dd className="font-mono text-xs text-gray-700">{claims?.name}</dd>
          </div>
        </dl>
      </div>

      <LogoutButton
        onSignOut={async () => {
          "use server";

          await signOut(logtoConfig);
        }}
      />
    </div>
  );
}
