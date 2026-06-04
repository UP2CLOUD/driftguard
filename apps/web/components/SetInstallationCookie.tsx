"use client";
import { useEffect } from "react";

export function SetInstallationCookie({ installationId }: { installationId: string }) {
  useEffect(() => {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `dg_installation=${installationId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`;
  }, [installationId]);
  return null;
}
