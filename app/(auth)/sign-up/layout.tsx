import type { Metadata } from "next";

// See sign-in/layout.tsx — the surrounding auth layout is a client component.
export const metadata: Metadata = {
  description: "Create a BookGrait account to book grAIt workshops.",
  robots: { follow: false, index: false },
  title: "Sign up",
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
