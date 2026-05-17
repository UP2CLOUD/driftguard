import { auth } from "@/auth";
import { NotFoundPage } from "@/components/NotFoundPage";

export default async function NotFound() {
  const session = await auth();
  return <NotFoundPage hasSession={!!session} />;
}
