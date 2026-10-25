"use client";

import { Clock, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface PaymentState {
  amount: string;
  links: { label: string; url: string }[];
  reference: string;
  reported: boolean;
}

/**
 * A reserved seat on a paid event: amount, reference to quote, pay buttons
 * and "I've paid", which flags the booking for the host to check.
 */
export function RsvpPayment({
  eventId,
  payment,
}: {
  eventId: string;
  payment: PaymentState;
}) {
  const [reported, setReported] = useState(payment.reported);
  const [loading, setLoading] = useState(false);

  async function reportPayment() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp/payment`, {
        method: "POST",
      });
      if (res.ok) {
        setReported(true);
        toast.success("Thanks! The host will confirm your payment.");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message ?? "Couldn't send that");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function copyReference() {
    navigator.clipboard
      .writeText(payment.reference)
      .then(() => toast.success("Reference copied"))
      .catch(() => toast.error("Couldn't copy"));
  }

  return (
    <>
      <div className="flex items-center justify-center gap-2 rounded-md border bg-muted px-4 py-3 font-medium text-muted-foreground text-sm">
        <Clock className="h-4 w-4" />
        {reported ? "Payment being checked" : "Seat reserved · pay to confirm"}
      </div>
      <div className="space-y-1 rounded-md border p-4 text-sm">
        <p className="text-muted-foreground text-xs">Amount</p>
        <p className="font-semibold text-xl">{payment.amount}</p>
        <p className="pt-2 text-muted-foreground text-xs">
          Payment reference — add it to the payment note
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono font-semibold">{payment.reference}</p>
          <Button
            aria-label="Copy payment reference"
            onClick={copyReference}
            size="icon"
            variant="ghost"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {payment.links.map((link) => (
        <Button asChild className="w-full" key={link.label} size="lg">
          <a href={link.url} rel="noopener noreferrer" target="_blank">
            Pay {payment.amount} with {link.label}
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      ))}
      {reported ? (
        <p className="text-center text-muted-foreground text-xs">
          Thanks! The host is checking your payment. Your ticket arrives by
          email once it's confirmed.
        </p>
      ) : (
        <Button
          className="w-full"
          disabled={loading}
          onClick={reportPayment}
          variant="outline"
        >
          {loading ? "Sending..." : "I've paid"}
        </Button>
      )}
    </>
  );
}
