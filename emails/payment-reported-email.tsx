import { Button, Section, Text } from "@react-email/components";
import { CardHeader, EmailLayout } from "./components/email-layout";

interface PaymentReportedEmailProps {
  amount: string;
  attendeesUrl: string;
  eventTitle: string;
  guestEmail: string;
  guestName: string;
  reference: string;
}

export default function PaymentReportedEmail({
  amount,
  attendeesUrl,
  eventTitle,
  guestEmail,
  guestName,
  reference,
}: PaymentReportedEmailProps) {
  return (
    <EmailLayout
      preview={`${guestName} says they paid ${amount} (${reference})`}
    >
      <CardHeader subtitle={eventTitle} title="Payment to check" />

      <Section className="px-[32px] py-[28px]">
        <Text className="m-0 text-[#3f3f46] text-[15px] leading-[24px]">
          <strong className="text-[#18181b]">{guestName}</strong> ({guestEmail})
          says they paid <strong className="text-[#18181b]">{amount}</strong>.
          Look for reference{" "}
          <strong className="font-mono text-[#18181b]">{reference}</strong> in
          PayPal or Revolut, then approve the guest to send their ticket.
        </Text>

        <Section className="mt-[24px]">
          <Button
            className="box-border block w-full rounded-[10px] bg-[#18181b] px-[24px] py-[14px] text-center font-semibold text-[15px] text-white no-underline"
            href={attendeesUrl}
          >
            Open guest list
          </Button>
        </Section>
      </Section>
    </EmailLayout>
  );
}

PaymentReportedEmail.PreviewProps = {
  amount: "€99",
  attendeesUrl: "https://openluma.m-2.cc/dashboard/events/evt_123/attendees",
  eventTitle: "AI Beyond ChatGPT",
  guestEmail: "guest@example.com",
  guestName: "Alex",
  reference: "OL-7K3F9Q",
} satisfies PaymentReportedEmailProps;

export { PaymentReportedEmail };
