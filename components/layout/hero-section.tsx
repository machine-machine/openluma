"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { Button } from "@/components/ui/button";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { MetalButton } from "@/components/ui/metal-button";
import { PixelHeading } from "@/components/ui/pixel-heading-character";
import { PixelParagraph } from "@/components/ui/pixel-paragraph-words";

export function HeroSection() {
  const { resolvedTheme } = useTheme();
  const gridColor =
    resolvedTheme === "dark" ? "rgb(255,255,255)" : "rgb(0,0,0)";

  return (
    <section className="relative w-full overflow-hidden py-24 text-center md:py-36">
      {/* Flickering grid background, fades out toward bottom */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
      >
        <FlickeringGrid
          className="size-full"
          color={gridColor}
          flickerChance={0.1}
          gridGap={6}
          maxOpacity={0.06}
          squareSize={4}
        />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center">
          {/* Single memorable claim, not a multi-feature pill */}
          <div className="mb-8 inline-flex items-center rounded-full border bg-muted/50 px-4 py-1.5 text-muted-foreground text-sm">
            <AnimatedShinyText>Workshops & sessions by grAIt</AnimatedShinyText>
          </div>

          {/* Brand-first: BookGrait is the hero-level signal */}
          <PixelHeading
            autoPlay
            className="font-bold text-5xl leading-none tracking-tight sm:text-7xl lg:text-8xl"
            cycleInterval={300}
            mode="wave"
            showLabel={false}
            staggerDelay={120}
          >
            BookGrait
          </PixelHeading>

          <p className="mt-4 font-semibold text-2xl text-foreground tracking-tight sm:text-3xl">
            Learn AI by building with it.
          </p>

          <PixelParagraph
            className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground leading-relaxed"
            font="circle"
            pixelWordClassName="text-foreground"
            pixelWords={["hands-on", "AI", "PayPal or Revolut"]}
            text="Book hands-on AI workshops and sessions with Mariusz Kreft. Pick a date, reserve your seat, pay by PayPal or Revolut."
          />

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <MetalButton asChild size="lg">
              <Link href="/events">
                Browse workshops
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </MetalButton>
            <Button asChild size="lg" variant="outline">
              <a href="https://grait.io">About grAIt</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
