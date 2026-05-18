"use client";

import { useParams } from "next/navigation";
import { InstallationNotFoundView } from "@/components/InstallationNotFoundView";

export function InstallationNotFoundFromPath() {
  const params = useParams();
  const installationId = typeof params.installationId === "string" ? params.installationId : undefined;
  return <InstallationNotFoundView installationId={installationId} />;
}
