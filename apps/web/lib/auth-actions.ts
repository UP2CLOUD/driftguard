"use server";

import { signIn, signOut } from "@/auth";
import { redirect } from "next/navigation";

export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/dashboard" });
}

export async function signOutToHome() {
  await signOut({ redirectTo: "/", redirect: false });
  redirect("/");
}
