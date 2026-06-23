"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// App-wide client providers. Holds the React Query client in state so it is
// created once per browser session (not on every render). Wraps the app in
// the root layout so any client component can use React Query hooks.
export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
