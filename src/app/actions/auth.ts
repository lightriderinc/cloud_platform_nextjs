"use server";

import { logtoConfig } from "@/app/logto";
import { signIn } from "@logto/next/server-actions";

export async function handleSignIn() {
  await signIn(logtoConfig);
}
