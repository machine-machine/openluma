import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import {
  GeistPixelCircle,
  GeistPixelGrid,
  GeistPixelLine,
  GeistPixelSquare,
  GeistPixelTriangle,
} from "geist/font/pixel";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { extractRouterConfig } from "uploadthing/server";
import { Analytics } from "@/components/analytics";
import { JsonLd } from "@/components/seo/json-ld";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAppUrl } from "@/lib/app-url";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/seo/structured-data";
import { ourFileRouter } from "@/lib/uploadthing";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";
import "streamdown/styles.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const SITE_NAME = "BookGrait";
const SITE_TITLE = "BookGrait | Workshops & sessions by grAIt";
const SITE_DESCRIPTION =
  "Book hands-on AI workshops and sessions by grAIt with Mariusz Kreft. Pick a date, reserve your seat, pay by PayPal or Revolut.";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  applicationName: SITE_NAME,
  authors: [{ name: "Mariusz Kreft", url: "https://grait.io" }],
  creator: SITE_NAME,
  description: SITE_DESCRIPTION,
  keywords: [
    "AI workshop",
    "AI training",
    "AI agents",
    "Ibiza workshop",
    "grAIt",
    "Mariusz Kreft",
  ],
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(getAppUrl()),
  openGraph: {
    description: SITE_DESCRIPTION,
    locale: "en_US",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    type: "website",
    url: "/",
  },
  publisher: SITE_NAME,
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    index: true,
  },
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  twitter: {
    card: "summary_large_image",
    description: SITE_DESCRIPTION,
    title: SITE_TITLE,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { color: "#ffffff", media: "(prefers-color-scheme: light)" },
    { color: "#0a0a0a", media: "(prefers-color-scheme: dark)" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable} ${GeistPixelSquare.variable} ${GeistPixelGrid.variable} ${GeistPixelCircle.variable} ${GeistPixelTriangle.variable} ${GeistPixelLine.variable} h-full antialiased`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <JsonLd data={buildOrganizationJsonLd()} id="ld-organization" />
        <JsonLd data={buildWebSiteJsonLd()} id="ld-website" />
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <QueryProvider>
            <TooltipProvider>
              {children}
              <Toaster />
              <Analytics />
            </TooltipProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
