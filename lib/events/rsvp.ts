import { and, asc, eq, inArray, ne, type SQL } from "drizzle-orm";
import { z } from "zod/v4";
import { trackServerEvent } from "@/lib/analytics";
import { db } from "@/lib/db";
import {
  type eventQuestions,
  events,
  invitations,
  rsvps,
  rsvpTimeline,
  user,
} from "@/lib/db/schema";
import { sendRsvpConfirmationEmail } from "@/lib/email";
import { invitationEmailMatches } from "@/lib/events/invitations";
import {
  createPaymentReference,
  formatPrice,
  isPaidEvent,
  paymentLinks,
  quotePrice,
} from "@/lib/payments";

interface RsvpUser {
  email: string;
  emailVerified: boolean;
  id: string;
}

type RsvpResult =
  | { error: string; ok: false; status: 400 | 403 | 404 }
  | { created: boolean; ok: true; rsvp: typeof rsvps.$inferSelect };

type RsvpStatus = (typeof rsvps.$inferSelect)["status"];
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Question = Pick<
  typeof eventQuestions.$inferSelect,
  "id" | "label" | "options" | "required" | "type"
>;

const MAX_ANSWER_LENGTH = 2000;
const messageInput = z.string().trim().max(500).optional();
const sourceText = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .optional()
  .catch(undefined);
const sourceInput = z
  .object({
    utm_campaign: sourceText,
    utm_medium: sourceText,
    utm_source: sourceText,
  })
  .optional()
  .catch(undefined);

/**
 * Locks the event row for the rest of the transaction. Every change that takes
 * or frees a seat goes through it, so capacity checks can't interleave.
 */
async function lockEvent(tx: Tx, eventId: string) {
  const [event] = await tx
    .select({
      capacity: events.capacity,
      currency: events.currency,
      earlyBirdEndsAt: events.earlyBirdEndsAt,
      earlyBirdPriceCents: events.earlyBirdPriceCents,
      earlyBirdSeats: events.earlyBirdSeats,
      priceCents: events.priceCents,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .for("update");
  return event;
}

type LockedEvent = NonNullable<Awaited<ReturnType<typeof lockEvent>>>;

function countApproved(tx: Tx, eventId: string) {
  return tx.$count(
    rsvps,
    and(eq(rsvps.eventId, eventId), eq(rsvps.status, "approved"))
  );
}

// On a paid event an unpaid (pending) booking holds its seat, so a 12-seat
// workshop can't take more payments than it has places.
function holdsSeat(event: LockedEvent, status: RsvpStatus) {
  return status === "approved" || (isPaidEvent(event) && status === "pending");
}

function countHeld(tx: Tx, eventId: string, event: LockedEvent) {
  return isPaidEvent(event)
    ? tx.$count(
        rsvps,
        and(
          eq(rsvps.eventId, eventId),
          inArray(rsvps.status, ["approved", "pending"])
        )
      )
    : countApproved(tx, eventId);
}

/** Price, tier and reference for a guest taking a seat on a paid event now. */
async function newBooking(tx: Tx, eventId: string, event: LockedEvent) {
  const earlyBirdTaken = await tx.$count(
    rsvps,
    and(
      eq(rsvps.eventId, eventId),
      eq(rsvps.priceTier, "early_bird"),
      inArray(rsvps.status, ["approved", "pending"])
    )
  );
  const quote = quotePrice(event, earlyBirdTaken);
  return quote
    ? {
        paymentReference: createPaymentReference(),
        paymentStatus: "unpaid" as const,
        priceCents: quote.priceCents,
        priceTier: quote.tier,
      }
    : {};
}

/** What the pending email shows a guest who still has to pay. */
export async function paymentDetails(
  rsvp: Pick<
    typeof rsvps.$inferSelect,
    "paymentReference" | "paymentStatus" | "priceCents" | "priceTier"
  >,
  eventId: string
) {
  if (!(rsvp.priceCents && rsvp.paymentReference)) {
    return;
  }
  const event = await db.query.events.findFirst({
    columns: { currency: true },
    where: eq(events.id, eventId),
  });
  const currency = event?.currency ?? "EUR";
  return {
    amount: formatPrice(rsvp.priceCents, currency),
    links: paymentLinks(rsvp.priceCents, currency),
    reference: rsvp.paymentReference,
    tier: rsvp.priceTier,
  };
}

function toggleError(q: Question, value: unknown) {
  if (value !== undefined && typeof value !== "boolean") {
    return `"${q.label}" must be yes or no.`;
  }
  if (q.required && q.type === "terms" && value !== true) {
    return `You must agree to "${q.label}".`;
  }
}

function textError(q: Question, value: unknown) {
  if (value !== undefined && typeof value !== "string") {
    return `"${q.label}" must be text.`;
  }
  const text = value?.trim() ?? "";
  if (text.length > MAX_ANSWER_LENGTH) {
    return `"${q.label}" is too long.`;
  }
  if (
    q.type === "dropdown" &&
    text &&
    !q.options?.some((option) => option.trim() === text)
  ) {
    return `"${q.label}" must be one of the listed options.`;
  }
  if (q.required && !text) {
    return `"${q.label}" is required.`;
  }
}

function fieldError(q: Question, value: unknown) {
  return q.type === "checkbox" || q.type === "terms"
    ? toggleError(q, value)
    : textError(q, value);
}

/**
 * Keeps only answers to the event's questions, checks their types and applies
 * the same required rules as the registration dialog. Returns an error message
 * for invalid answers.
 */
export function parseAnswers(
  questions: Question[],
  raw: unknown
): Record<string, string | boolean> | string {
  const given =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const answers: Record<string, string | boolean> = {};

  for (const q of questions) {
    const fields: [string, Question][] = [[q.id, q]];
    // The company question also asks for an optional job title.
    if (q.type === "company") {
      fields.push([`${q.id}_jobtitle`, { ...q, required: false }]);
    }
    for (const [key, field] of fields) {
      const value = given[key];
      const error = fieldError(field, value);
      if (error) {
        return error;
      }
      if (typeof value === "boolean") {
        answers[key] = value;
      } else if (typeof value === "string" && value.trim()) {
        answers[key] = value.trim();
      }
    }
  }
  return answers;
}

/**
 * The single path for a guest registering for an event. Enforces host
 * self-RSVP, private-event invitations, host rejections, registration
 * questions and capacity, so every entry point (API, AI agent) applies the
 * same rules.
 */
export async function submitRsvp(
  eventId: string,
  rsvpUser: RsvpUser,
  input: { customAnswers?: unknown; message?: unknown; source?: unknown } = {}
): Promise<RsvpResult> {
  const event = await db.query.events.findFirst({
    columns: {
      endTime: true,
      hostId: true,
      id: true,
      location: true,
      requiresApproval: true,
      slug: true,
      startTime: true,
      timezone: true,
      title: true,
      visibility: true,
    },
    where: eq(events.id, eventId),
    with: {
      questions: {
        columns: {
          id: true,
          label: true,
          options: true,
          required: true,
          type: true,
        },
      },
    },
  });

  if (!event) {
    return { error: "Event not found", ok: false, status: 404 };
  }

  if (event.hostId === rsvpUser.id) {
    return { error: "You are the host of this event", ok: false, status: 400 };
  }

  // Invitations are matched by email, which only proves identity once verified.
  const userInvitation = rsvpUser.emailVerified
    ? await db.query.invitations.findFirst({
        columns: { status: true },
        where: and(
          eq(invitations.eventId, eventId),
          invitationEmailMatches(rsvpUser.email)
        ),
      })
    : undefined;
  const hasAcceptedInvite = userInvitation?.status === "accepted";

  if (event.visibility === "private" && !hasAcceptedInvite) {
    return {
      error: "This is a private event. You need an invitation to RSVP.",
      ok: false,
      status: 403,
    };
  }

  const source = sourceInput.parse(input.source);
  const message = messageInput.safeParse(input.message);
  if (!message.success) {
    return {
      error: "Message must be 500 characters or fewer",
      ok: false,
      status: 400,
    };
  }

  const outcome = await db.transaction(async (tx) => {
    const locked = await lockEvent(tx, eventId);
    if (!locked) {
      return { kind: "missing" } as const;
    }

    const existing = await tx.query.rsvps.findFirst({
      where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, rsvpUser.id)),
    });
    if (existing) {
      return { existing, kind: "existing" } as const;
    }

    const answers = parseAnswers(event.questions, input.customAnswers);
    if (typeof answers === "string") {
      return { error: answers, kind: "invalid" } as const;
    }

    // Invited guests who accepted are approved outright; everyone else follows
    // the event's approval and capacity rules.
    // A paid seat stays pending until the host confirms the payment.
    const paid = isPaidEvent(locked);
    const resolveStatus = async () => {
      if (hasAcceptedInvite && !paid) {
        return "approved";
      }
      if (
        locked.capacity &&
        (await countHeld(tx, eventId, locked)) >= locked.capacity
      ) {
        return "waitlisted";
      }
      return paid || event.requiresApproval ? "pending" : "approved";
    };
    const status = await resolveStatus();

    const [rsvp] = await tx
      .insert(rsvps)
      .values({
        customAnswers: event.questions.length > 0 ? answers : null,
        eventId,
        message: message.data || null,
        sourceCampaign: source?.utm_campaign ?? null,
        sourceMedium: source?.utm_medium ?? null,
        sourceName: source?.utm_source ?? null,
        status,
        userId: rsvpUser.id,
        ...(status === "pending" ? await newBooking(tx, eventId, locked) : {}),
      })
      .returning();
    return { kind: "created", rsvp } as const;
  });

  if (outcome.kind === "missing") {
    return { error: "Event not found", ok: false, status: 404 };
  }
  if (outcome.kind === "invalid") {
    return { error: outcome.error, ok: false, status: 400 };
  }
  if (outcome.kind === "existing") {
    // A rejection is the host's decision; only the host can reverse it.
    if (outcome.existing.status === "rejected") {
      return {
        error: "The host declined your RSVP for this event.",
        ok: false,
        status: 403,
      };
    }
    return { created: false, ok: true, rsvp: outcome.existing };
  }

  const { rsvp } = outcome;
  trackServerEvent(
    rsvp.status === "pending" && rsvp.priceCents
      ? "seat_reserved"
      : `rsvp_${rsvp.status}`,
    {
      event: event.slug,
      price: rsvp.priceCents ? rsvp.priceCents / 100 : undefined,
      source: rsvp.sourceName,
      tier: rsvp.priceTier,
    },
    `/e/${event.slug}`
  );
  db.insert(rsvpTimeline)
    .values({
      eventId,
      rsvpId: rsvp.id,
      toStatus: rsvp.status,
      type: "registered",
    })
    .catch(() => {
      // ignore: best-effort timeline logging, must not block RSVP creation
    });

  // Send confirmation email (ticket if auto-approved, pending notice otherwise)
  if (rsvp.status === "approved" || rsvp.status === "pending") {
    await sendRsvpConfirmationEmail(
      rsvpUser.email,
      event.title,
      rsvp.status,
      {
        endTime: event.endTime,
        id: event.id,
        location: event.location,
        slug: event.slug ?? undefined,
        startTime: event.startTime,
        timezone: event.timezone,
        title: event.title,
      },
      undefined,
      await paymentDetails(rsvp, eventId)
    ).catch((err) => console.error("Failed to send ticket email:", err));
  }

  return { created: true, ok: true, rsvp };
}

/**
 * Deletes the event's RSVP matching `match`. If it held a seat and the event
 * now has room, the longest-waiting waitlisted guest gets the seat and is
 * emailed their ticket. Returns whether an RSVP was deleted.
 */
export async function removeRsvp(eventId: string, match: SQL) {
  const { promoted, removed } = await db.transaction(async (tx) => {
    const locked = await lockEvent(tx, eventId);
    const [deleted] = await tx
      .delete(rsvps)
      .where(and(eq(rsvps.eventId, eventId), match))
      .returning({ status: rsvps.status });
    return {
      promoted:
        locked && deleted && holdsSeat(locked, deleted.status)
          ? await promoteNext(tx, eventId, locked)
          : undefined,
      removed: !!deleted,
    };
  });

  if (promoted) {
    afterPromotion(eventId, promoted);
  }
  return removed;
}

/**
 * The host's status change for one RSVP. Approving is refused once the event
 * is full, and a guest leaving "approved" hands their seat to the waitlist.
 */
export async function setRsvpStatus(
  eventId: string,
  rsvpId: string,
  status: RsvpStatus
) {
  const outcome = await db.transaction(async (tx) => {
    const locked = await lockEvent(tx, eventId);
    const [current] = await tx
      .select({ status: rsvps.status })
      .from(rsvps)
      .where(and(eq(rsvps.id, rsvpId), eq(rsvps.eventId, eventId)));
    if (!(locked && current)) {
      return { kind: "missing" } as const;
    }
    if (
      status === "approved" &&
      !holdsSeat(locked, current.status) &&
      locked.capacity &&
      (await countHeld(tx, eventId, locked)) >= locked.capacity
    ) {
      return { kind: "full" } as const;
    }

    // On a paid event the host approves once the payment has arrived.
    const paid = isPaidEvent(locked);
    let payment = {};
    if (paid && status === "approved") {
      payment = { paymentStatus: "paid" as const };
    } else if (paid && status === "pending" && current.status !== "pending") {
      payment = await newBooking(tx, eventId, locked);
    }
    const [rsvp] = await tx
      .update(rsvps)
      .set({ status, updatedAt: new Date(), ...payment })
      .where(eq(rsvps.id, rsvpId))
      .returning();
    const promoted =
      holdsSeat(locked, current.status) && !holdsSeat(locked, status)
        ? await promoteNext(tx, eventId, locked, rsvpId)
        : undefined;
    return {
      fromStatus: current.status,
      kind: "updated",
      promoted,
      rsvp,
    } as const;
  });

  if (outcome.kind === "updated" && outcome.promoted) {
    afterPromotion(eventId, outcome.promoted);
  }
  return outcome;
}

/**
 * Gives a free seat to the longest-waiting waitlisted guest (other than
 * `skipId`), if the event has room. Call with the event locked.
 */
async function promoteNext(
  tx: Tx,
  eventId: string,
  event: LockedEvent,
  skipId?: string
) {
  if (
    event.capacity &&
    (await countHeld(tx, eventId, event)) >= event.capacity
  ) {
    return;
  }
  const next = await tx.query.rsvps.findFirst({
    columns: { id: true, userId: true },
    orderBy: [asc(rsvps.createdAt)],
    where: and(
      eq(rsvps.eventId, eventId),
      eq(rsvps.status, "waitlisted"),
      skipId ? ne(rsvps.id, skipId) : undefined
    ),
  });
  if (!next) {
    return;
  }
  // A paid seat is offered, not given: the guest gets payment instructions.
  const status = isPaidEvent(event) ? "pending" : "approved";
  const [promoted] = await tx
    .update(rsvps)
    .set({
      status,
      updatedAt: new Date(),
      ...(status === "pending" ? await newBooking(tx, eventId, event) : {}),
    })
    .where(eq(rsvps.id, next.id))
    .returning();
  return promoted;
}

function afterPromotion(eventId: string, promoted: typeof rsvps.$inferSelect) {
  db.insert(rsvpTimeline)
    .values({
      eventId,
      fromStatus: "waitlisted",
      rsvpId: promoted.id,
      toStatus: promoted.status,
      type: "status_changed",
    })
    .catch(() => {
      // ignore: best-effort timeline logging
    });
  notifyPromoted(eventId, promoted).catch((err) =>
    console.error("Failed to send waitlist promotion email:", err)
  );
}

async function notifyPromoted(
  eventId: string,
  promoted: typeof rsvps.$inferSelect
) {
  const [event, guest] = await Promise.all([
    db.query.events.findFirst({
      columns: {
        endTime: true,
        id: true,
        location: true,
        slug: true,
        startTime: true,
        timezone: true,
        title: true,
      },
      where: eq(events.id, eventId),
    }),
    db.query.user.findFirst({
      columns: { email: true },
      where: eq(user.id, promoted.userId),
    }),
  ]);
  if (!(event && guest?.email)) {
    return;
  }
  await sendRsvpConfirmationEmail(
    guest.email,
    event.title,
    promoted.status,
    {
      endTime: event.endTime,
      id: event.id,
      location: event.location,
      slug: event.slug ?? undefined,
      startTime: event.startTime,
      timezone: event.timezone,
      title: event.title,
    },
    undefined,
    await paymentDetails(promoted, eventId)
  );
}
