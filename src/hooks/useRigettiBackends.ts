"use client";

import { useBackendSource } from "./useBackendSource";
import { fetchRigettiBackends } from "@/lib/rigetti/client";

export function useRigettiBackends() {
  return useBackendSource("rigetti", fetchRigettiBackends);
}
