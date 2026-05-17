"use server";

import { signOut } from "@/auth";
import { redirect } from "next/navigation";

/** Sign out and redirect home without relying on Auth.js redirect URL (avoids /undefined). */
export async function signOutToHome() {
  await signOut({ redirectTo: "/", redirect: false });
  redirect("/");
}
