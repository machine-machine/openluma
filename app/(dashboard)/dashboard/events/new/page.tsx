import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EventForm } from "@/components/events/event-form";
import { getSession } from "@/lib/auth";
import { canHostEvents } from "@/lib/hosts";

export default async function NewEventPage() {
  const session = await getSession(await headers());
  if (!canHostEvents(session?.user ?? null)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Create Event</h1>
        <p className="text-muted-foreground">
          Fill in the details to create a new event.
        </p>
      </div>
      <EventForm />
    </div>
  );
}
