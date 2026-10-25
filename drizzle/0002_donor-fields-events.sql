ALTER TABLE "donors" ADD COLUMN IF NOT EXISTS "profession" varchar(120);--> statement-breakpoint
ALTER TABLE "donors" ADD COLUMN IF NOT EXISTS "blood_group" varchar(8);--> statement-breakpoint
ALTER TABLE "donors" ADD COLUMN IF NOT EXISTS "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "donors" ADD COLUMN IF NOT EXISTS "prior_total" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "department" varchar(120);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "incharge_name" varchar(120);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "incharge_user_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assets" ADD CONSTRAINT "assets_incharge_user_id_users_id_fk" FOREIGN KEY ("incharge_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "donation_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"donation_id" integer NOT NULL,
	"head_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"is_membership" boolean DEFAULT false NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "donation_lines" ADD CONSTRAINT "donation_lines_donation_id_donations_id_fk" FOREIGN KEY ("donation_id") REFERENCES "public"."donations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "donation_lines" ADD CONSTRAINT "donation_lines_head_id_heads_id_fk" FOREIGN KEY ("head_id") REFERENCES "public"."heads"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "donation_lines_donation_idx" ON "donation_lines" USING btree ("donation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "donation_lines_head_idx" ON "donation_lines" USING btree ("head_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gatherings" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(160) NOT NULL,
	"title_ur" varchar(160),
	"kind" varchar(40) DEFAULT 'majlis' NOT NULL,
	"hijri_month" integer,
	"hijri_day" integer,
	"hijri_year" integer,
	"gregorian_date" date NOT NULL,
	"suggested_amount" numeric(12, 2),
	"location" varchar(160),
	"description" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gatherings" ADD CONSTRAINT "gatherings_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gatherings_date_idx" ON "gatherings" USING btree ("gregorian_date");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sponsorships" (
	"id" serial PRIMARY KEY NOT NULL,
	"gathering_id" integer NOT NULL,
	"donor_id" integer NOT NULL,
	"offered_amount" numeric(12, 2) NOT NULL,
	"message" text,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"reviewed_by_id" integer,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_gathering_id_gatherings_id_fk" FOREIGN KEY ("gathering_id") REFERENCES "public"."gatherings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_donor_id_donors_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sponsorships_gathering_idx" ON "sponsorships" USING btree ("gathering_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sponsorships_donor_idx" ON "sponsorships" USING btree ("donor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sponsorships_status_idx" ON "sponsorships" USING btree ("status");
