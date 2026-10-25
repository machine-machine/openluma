import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canHostEvents } from "@/lib/hosts";

// The AI assistant creates and edits events, so it is organizer-only.
export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession(await headers());
  if (!canHostEvents(session?.user ?? null)) {
    redirect("/dashboard");
  }
  return children;
}
