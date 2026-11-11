"use client";

import { useBackendSource } from "./useBackendSource";
import { fetchIonqBackends } from "@/lib/ionq/client";

// Refreshed every minute, not the 5-minute default: the cards carry IonQ's
// live status, and a Forte going into maintenance should show promptly.
const ONE_MINUTE = 60 * 1000;

export function useIonqBackends() {
  return useBackendSource("ionq", fetchIonqBackends, ONE_MINUTE);
}
