import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, rsvps, rsvpTimeline, user } from "@/lib/db/schema";
import { sendPaymentReportedEmail } from "@/lib/email";
import { formatPrice } from "@/lib/payments";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * The guest says they paid. Only flags the RSVP for the host to check — the
 * seat is confirmed when the host approves it after seeing the money.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const limited = await checkRateLimit(request, "rsvp", {
    userId: session.user.id,
  });
  if (limited) {
    return limited;
  }

  const [updated] = await db
    .update(rsvps)
    .set({ paymentStatus: "reported", updatedAt: new Date() })
    .where(
      and(
        eq(rsvps.eventId, eventId),
        eq(rsvps.userId, session.user.id),
        eq(rsvps.status, "pending"),
        eq(rsvps.paymentStatus, "unpaid")
      )
    )
    .returning();

  if (!updated) {
    return Response.json(
      { message: "Nothing to pay for this event" },
      { status: 409 }
    );
  }

  db.insert(rsvpTimeline)
    .values({
      changedByName: session.user.name,
      eventId,
      fromStatus: "pending",
      rsvpId: updated.id,
      toStatus: "pending",
      type: "payment_reported",
    })
    .catch(() => {
      // ignore: best-effort timeline logging
    });

  const event = await db.query.events.findFirst({
    columns: { currency: true, hostId: true, title: true },
    where: eq(events.id, eventId),
  });
  const host = event
    ? await db.query.user.findFirst({
        columns: { email: true },
        where: eq(user.id, event.hostId),
      })
    : undefined;
  if (event && host?.email && updated.priceCents && updated.paymentReference) {
    sendPaymentReportedEmail(host.email, {
      amount: formatPrice(updated.priceCents, event.currency),
      eventId,
      eventTitle: event.title,
      guestEmail: session.user.email,
      guestName: session.user.name,
      reference: updated.paymentReference,
    }).catch((err) =>
      console.error("Failed to send payment notification:", err)
    );
  }

  return Response.json(updated);
}
