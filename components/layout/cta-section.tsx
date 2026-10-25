"use client";

import { ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetalButton } from "@/components/ui/metal-button";
import { PixelHeading } from "@/components/ui/pixel-heading-character";
import { PixelParagraph } from "@/components/ui/pixel-paragraph-words";

export function CtaSection() {
  return (
    <section className="border-t bg-muted/30 py-24" id="about">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Compass className="mx-auto mb-6 size-10 text-primary" />
          <PixelHeading
            as="h2"
            autoPlay
            className="font-bold text-3xl tracking-tight sm:text-4xl"
            cycleInterval={350}
            mode="wave"
            showLabel={false}
            staggerDelay={100}
          >
            Where are you with AI?
          </PixelHeading>
          <PixelParagraph
            className="mt-4 text-muted-foreground leading-relaxed"
            font="circle"
            pixelWordClassName="text-foreground"
            pixelWords={["4-minute", "seven-day plan"]}
            text="Take the free 4-minute AI Readiness Compass: find your blind spots and get a practical seven-day plan. No signup."
          />
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <MetalButton asChild size="lg">
              <a href="https://grait.io/ai-assessment/">
                Find my AI level
                <ArrowRight className="ml-2 size-4" />
              </a>
            </MetalButton>
            <Button asChild size="lg" variant="outline">
              <a href="mailto:hi@grait.io?subject=Workshop%20for%20my%20team">
                Workshop for my team
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
