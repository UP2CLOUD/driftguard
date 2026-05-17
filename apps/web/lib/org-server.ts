import { notFound } from "next/navigation";
import { ApiError, getOrg, type Org } from "@/lib/api";

export async function requireOrg(installationId: string): Promise<Org> {
  try {
    return await getOrg(installationId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }
}
