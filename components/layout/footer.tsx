import Link from "next/link";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";

const footerLinks = {
  grait: [
    { href: "https://grait.io", label: "grait.io" },
    { href: "https://grait.io/ibiza/", label: "Ibiza workshop" },
    { href: "https://grait.io/ai-assessment/", label: "AI Readiness Compass" },
  ],
  workshops: [
    { href: "/events", label: "Browse workshops" },
    { href: "/dashboard", label: "My bookings" },
    { href: "mailto:hi@grait.io", label: "Contact" },
  ],
};

const sections = [
  { links: footerLinks.workshops, title: "Workshops" },
  { links: footerLinks.grait, title: "grAIt" },
];

export function Footer() {
  return (
    <footer
      className="w-full border-border border-t bg-background"
      role="contentinfo"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:py-20">
          {/* Brand column */}
          <div className="flex flex-col gap-6 sm:col-span-2 lg:col-span-4">
            <Link aria-label="Go to home page" href="/">
              <Logo className="h-4" />
            </Link>
            <p className="max-w-xs text-muted-foreground text-sm leading-relaxed">
              Hands-on AI workshops and sessions by grAIt with Mariusz Kreft.
            </p>
          </div>

          {/* Navigation columns */}
          <nav
            aria-label="Footer navigation"
            className="col-span-1 grid grid-cols-2 gap-8 sm:col-span-2 sm:grid-cols-2 lg:col-span-8 lg:gap-12"
          >
            {sections.map((section) => (
              <div className="flex flex-col gap-3" key={section.title}>
                <h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  {section.title}
                </h4>
                <ul className="flex flex-col gap-2.5">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        className="text-foreground/80 text-sm transition-colors hover:text-foreground"
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <Separator aria-hidden="true" role="presentation" />

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          <p className="text-muted-foreground text-xs">
            &copy; {new Date().getFullYear()} Mariusz Kreft · grAIt
          </p>
          <p className="text-muted-foreground text-xs">
            Built on{" "}
            <a
              className="underline"
              href="https://github.com/Nishitbaria/openluma"
              rel="noopener noreferrer"
              target="_blank"
            >
              OpenLuma
            </a>{" "}
            (MIT)
          </p>
        </div>
      </div>
    </footer>
  );
}
