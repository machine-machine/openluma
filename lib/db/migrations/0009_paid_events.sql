CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'reported', 'paid');--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "currency" text DEFAULT 'EUR' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "early_bird_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "early_bird_price_cents" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "early_bird_seats" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "price_cents" integer;--> statement-breakpoint
ALTER TABLE "rsvps" ADD COLUMN "payment_reference" text;--> statement-breakpoint
ALTER TABLE "rsvps" ADD COLUMN "payment_status" "payment_status";--> statement-breakpoint
ALTER TABLE "rsvps" ADD COLUMN "price_cents" integer;--> statement-breakpoint
ALTER TABLE "rsvps" ADD COLUMN "price_tier" text;