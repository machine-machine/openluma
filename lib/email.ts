import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import EventReminderEmail from "@/emails/event-reminder-email";
import InvitationEmail from "@/emails/invitation-email";
import PaymentReportedEmail from "@/emails/payment-reported-email";
import RsvpStatusEmail, { type PaymentInfo } from "@/emails/rsvp-status-email";
import VerifyEmail from "@/emails/verify-email";
import { getAppUrl } from "@/lib/app-url";
import { icsText } from "@/lib/utils/export";

const apiKey = process.env.RESEND_API_KEY;
export const resend = apiKey ? new Resend(apiKey) : null;

// SMTP takes precedence over Resend when SMTP_HOST is set.
const smtpPort = Number(process.env.SMTP_PORT ?? 587);
const smtp = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      auth: process.env.SMTP_USER
        ? { pass: process.env.SMTP_PASS, user: process.env.SMTP_USER }
        : undefined,
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === "true"
        : smtpPort === 465,
    })
  : null;

export const emailEnabled = Boolean(smtp || resend);

const appUrl = getAppUrl();
const fromEmail = process.env.EMAIL_FROM ?? "BookGrait <hi@grait.io>";

type EmailPayload = Parameters<NonNullable<typeof resend>["emails"]["send"]>[0];
type EmailSendResult = Awaited<
  ReturnType<NonNullable<typeof resend>["emails"]["send"]>
>;

const SEND_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const RETRYABLE_NETWORK_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  // nodemailer: connection lost / greeting timeout
  "ECONNECTION",
  "ESOCKET",
]);
const ICS_DATE_SEPARATORS_RE = /[-:]/g;
const ICS_DATE_MILLIS_RE = /\.\d{3}/;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(statusCode: number | null | undefined) {
  return (
    typeof statusCode === "number" && (statusCode >= 500 || statusCode === 429)
  );
}

function isRetryableNetworkError(err: unknown) {
  const { code, responseCode } =
    (err as { code?: string; responseCode?: number } | undefined) ?? {};
  // SMTP 4xx replies are temporary failures (greylisting, rate limits).
  if (typeof responseCode === "number") {
    return responseCode >= 400 && responseCode < 500;
  }
  return typeof code === "string" && RETRYABLE_NETWORK_CODES.has(code);
}

async function deliver(
  payload: EmailPayload,
  idempotencyKey: string
): Promise<EmailSendResult> {
  if (smtp) {
    const p = payload as {
      attachments?: {
        content: Buffer | string;
        contentType?: string;
        filename: string;
      }[];
      from: string;
      html?: string;
      subject: string;
      to: string | string[];
    };
    const info = await smtp.sendMail({
      attachments: p.attachments,
      from: p.from,
      // Stable Message-ID: a retried send reuses it, so mail clients dedupe.
      html: p.html,
      messageId: `<${idempotencyKey}@${new URL(appUrl).hostname}>`,
      subject: p.subject,
      to: p.to,
    });
    return {
      data: { id: info.messageId },
      error: null,
    } as unknown as EmailSendResult;
  }
  if (!resend) {
    throw new Error("Email is not configured");
  }
  return resend.emails.send(payload, { idempotencyKey });
}

/**
 * Sends an email with a deterministic idempotency key (safe retries without
 * duplicate sends), retrying transient failures (5xx, 429, network errors)
 * with exponential backoff + jitter, and a per-attempt timeout.
 *
 * 4xx errors (other than 429) are not retried — they indicate a bad request
 * that won't succeed on retry.
 */
async function sendWithReliability(
  payload: EmailPayload,
  idempotencyKey: string
): Promise<EmailSendResult> {
  let lastResult: EmailSendResult | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      // biome-ignore lint/performance/noAwaitInLoops: retry loop is inherently sequential — each attempt must observe the previous attempt's result/timeout before deciding whether (and how long) to back off before the next try.
      const result = await Promise.race([
        deliver(payload, idempotencyKey),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                Object.assign(new Error("Email send timed out"), {
                  code: "ETIMEDOUT",
                })
              ),
            SEND_TIMEOUT_MS
          )
        ),
      ]);

      lastResult = result;

      if (!(result.error && isRetryableStatus(result.error.statusCode))) {
        return result;
      }

      if (attempt === MAX_RETRIES - 1) {
        console.error(
          `Email send failed permanently after ${MAX_RETRIES} attempts (key: ${idempotencyKey}):`,
          result.error
        );
        return result;
      }

      console.warn(
        `Email send attempt ${attempt + 1} failed (key: ${idempotencyKey}), retrying:`,
        result.error
      );
    } catch (err) {
      if (!isRetryableNetworkError(err) || attempt === MAX_RETRIES - 1) {
        console.error(
          `Email send failed permanently after ${attempt + 1} attempt(s) (key: ${idempotencyKey}):`,
          err
        );
        throw err;
      }

      console.warn(
        `Email send attempt ${attempt + 1} threw a retryable error (key: ${idempotencyKey}), retrying:`,
        err
      );
    }

    const backoff =
      Math.min(1000 * 2 ** attempt, 30_000) + Math.random() * 1000;
    await sleep(backoff);
  }

  // Unreachable given the loop above always returns/throws on the last attempt,
  // but keeps TypeScript happy and satisfies the compiler's control-flow analysis.
  return lastResult as EmailSendResult;
}

function eventLink(event: { id: string; slug?: string }) {
  return `${appUrl}${event.slug ? `/e/${event.slug}` : `/events/${event.id}`}`;
}

function generateICS(event: {
  title: string;
  startTime: Date;
  endTime: Date | null;
  location: string | null;
  id: string;
  slug?: string;
}): string {
  const formatDate = (d: Date) =>
    d
      .toISOString()
      .replace(ICS_DATE_SEPARATORS_RE, "")
      .replace(ICS_DATE_MILLIS_RE, "");

  const end =
    event.endTime ?? new Date(event.startTime.getTime() + 60 * 60 * 1000);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BookGrait//Event//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${formatDate(event.startTime)}`,
    `DTEND:${formatDate(end)}`,
    `SUMMARY:${icsText(event.title)}`,
    `LOCATION:${icsText(event.location)}`,
    `URL:${eventLink(event)}`,
    `DESCRIPTION:View your ticket: ${appUrl}/ticket/${event.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function sendInvitationEmail(
  to: string,
  eventTitle: string,
  inviteToken: string,
  role: "attendee" | "cohost" = "attendee"
) {
  if (!emailEnabled) {
    console.warn("Email not configured, skipping invitation email");
    return;
  }

  const inviteUrl = `${appUrl}/api/invitations/${inviteToken}`;
  const isCohost = role === "cohost";

  const html = await render(
    InvitationEmail({
      acceptUrl: `${inviteUrl}?action=accept`,
      declineUrl: `${inviteUrl}?action=decline`,
      eventTitle,
      role,
    })
  );

  const { data, error } = await sendWithReliability(
    {
      from: fromEmail,
      html,
      subject: isCohost
        ? `You're invited to co-host ${eventTitle}`
        : `You're invited to ${eventTitle}`,
      to,
    },
    `invite-${inviteToken}-${role}`
  );

  if (error) {
    console.error("Failed to send invitation email:", error);
  }
  return { data, error };
}

export async function sendRsvpConfirmationEmail(
  to: string,
  eventTitle: string,
  status: string,
  event?: {
    id: string;
    slug?: string;
    title: string;
    startTime: Date;
    endTime: Date | null;
    location: string | null;
    timezone?: string;
  },
  customMessage?: string,
  payment?: PaymentInfo
) {
  if (!emailEnabled) {
    return;
  }

  const eventUrl = event ? eventLink(event) : appUrl;
  const ticketUrl = event ? `${appUrl}/ticket/${event.id}` : undefined;
  const isApproved = status === "approved";

  const subjectMap: Record<string, string> = {
    approved: `You're in! 🎉 ${eventTitle}`,
    pending: `RSVP received — ${eventTitle}`,
    rejected: `RSVP update — ${eventTitle}`,
    waitlisted: `You're on the waitlist — ${eventTitle}`,
  };

  const html = await render(
    RsvpStatusEmail({
      customMessage,
      event: event
        ? {
            endTime: event.endTime,
            location: event.location,
            startTime: event.startTime,
            timezone: event.timezone,
          }
        : undefined,
      eventTitle,
      eventUrl,
      payment,
      status,
      ticketUrl,
    })
  );

  const attachments =
    isApproved && event
      ? [
          {
            content: Buffer.from(generateICS(event)),
            contentType: "text/calendar",
            filename: `${eventTitle.replace(/\s+/g, "-").toLowerCase()}.ics`,
          },
        ]
      : undefined;

  const { data, error } = await sendWithReliability(
    {
      from: fromEmail,
      html,
      subject: subjectMap[status] ?? `RSVP update — ${eventTitle}`,
      to,
      ...(attachments ? { attachments } : {}),
    },
    // biome-ignore lint/suspicious/noUnnecessaryConditions: `event` is an optional parameter and can be undefined at runtime; Biome's inference mistakes the non-optional `id` field on the object type for a guarantee that `event` itself is present.
    `rsvp-${event?.id ?? "noevent"}-${to}-${status}`
  );

  if (error) {
    console.error("Failed to send RSVP email:", error);
  }
  return { data, error };
}

export async function sendEventReminderEmail(
  to: string,
  eventTitle: string,
  startTime: Date,
  timezone: string,
  event?: {
    id: string;
    slug?: string;
    endTime?: Date | null;
    location?: string | null;
  }
) {
  if (!emailEnabled) {
    return;
  }

  const eventUrl = event ? eventLink(event) : appUrl;
  const ticketUrl = event ? `${appUrl}/ticket/${event.id}` : undefined;

  const html = await render(
    EventReminderEmail({
      endTime: event?.endTime,
      eventTitle,
      eventUrl,
      location: event?.location,
      startTime,
      ticketUrl,
      timezone,
    })
  );

  const { data, error } = await sendWithReliability(
    {
      from: fromEmail,
      html,
      subject: `Reminder: ${eventTitle} is coming up!`,
      to,
    },
    // biome-ignore lint/suspicious/noUnnecessaryConditions: `event` is an optional parameter and can be undefined at runtime; Biome's inference mistakes the non-optional `id` field on the object type for a guarantee that `event` itself is present.
    `reminder-${event?.id ?? eventTitle}-${to}-${startTime.toISOString()}`
  );

  if (error) {
    throw Object.assign(new Error("Failed to send reminder email"), {
      cause: error,
    });
  }
  return { data };
}

export async function sendVerificationEmail(
  to: string,
  verifyUrl: string,
  token: string
) {
  if (!emailEnabled) {
    // Without an email provider there is no other way to finish sign-up
    // locally; never log the link in production, it is a credential.
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email is not configured, cannot verify email");
    }
    console.warn(`Email not configured. Verify ${to} at: ${verifyUrl}`);
    return;
  }

  const html = await render(VerifyEmail({ verifyUrl }));

  const { error } = await sendWithReliability(
    {
      from: fromEmail,
      html,
      subject: "Verify your email for BookGrait",
      to,
    },
    `verify-${token}`
  );

  if (error) {
    throw Object.assign(new Error("Failed to send verification email"), {
      cause: error,
    });
  }
}

/** Tells the host a guest says they paid, so they can check and approve. */
export async function sendPaymentReportedEmail(
  to: string,
  details: {
    amount: string;
    eventId: string;
    eventTitle: string;
    guestEmail: string;
    guestName: string;
    reference: string;
  }
) {
  if (!emailEnabled) {
    return;
  }
  const html = await render(
    PaymentReportedEmail({
      ...details,
      attendeesUrl: `${appUrl}/dashboard/events/${details.eventId}/attendees`,
    })
  );
  const { error } = await sendWithReliability(
    {
      from: fromEmail,
      html,
      subject: `Payment to check: ${details.reference} — ${details.eventTitle}`,
      to,
    },
    `payment-reported-${details.reference}`
  );
  if (error) {
    console.error("Failed to send payment notification email:", error);
  }
}
