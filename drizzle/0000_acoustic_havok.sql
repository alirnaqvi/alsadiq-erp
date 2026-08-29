CREATE TYPE "public"."donation_status" AS ENUM('completed', 'pending', 'void');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'bank_transfer', 'cheque', 'online');--> statement-breakpoint
CREATE TYPE "public"."data_scope" AS ENUM('own', 'team', 'all');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer,
	"actor_name" varchar(120),
	"action" varchar(40) NOT NULL,
	"entity_type" varchar(24) NOT NULL,
	"entity_id" integer,
	"summary" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"ip" varchar(60),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counters" (
	"key" varchar(40) PRIMARY KEY NOT NULL,
	"value" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_no" varchar(20) NOT NULL,
	"donor_id" integer NOT NULL,
	"head_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_method" "payment_method" DEFAULT 'cash' NOT NULL,
	"status" "donation_status" DEFAULT 'completed' NOT NULL,
	"cheque_no" varchar(40),
	"bank_name" varchar(80),
	"slip_ref" varchar(120),
	"slip_url" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"collected_by_id" integer NOT NULL,
	"is_membership" boolean DEFAULT false NOT NULL,
	"membership_month" varchar(7),
	"remarks" text,
	"voided_by_id" integer,
	"void_reason" text,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donations_receipt_no_unique" UNIQUE("receipt_no")
);
--> statement-breakpoint
CREATE TABLE "donors" (
	"id" serial PRIMARY KEY NOT NULL,
	"donor_code" varchar(20) NOT NULL,
	"legacy_code" varchar(40),
	"full_name" varchar(140) NOT NULL,
	"mobile" varchar(24) NOT NULL,
	"alt_mobile" varchar(24),
	"cnic" varchar(20),
	"email" varchar(160),
	"address" text,
	"city" varchar(80),
	"shares_mobile_with" varchar(24),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donors_donor_code_unique" UNIQUE("donor_code")
);
--> statement-breakpoint
CREATE TABLE "heads" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(120) NOT NULL,
	"name_ur" varchar(120),
	"parent_id" integer,
	"is_event" boolean DEFAULT false NOT NULL,
	"event_date" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "heads_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(24) NOT NULL,
	"entity_id" integer NOT NULL,
	"body" text NOT NULL,
	"author_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pledges" (
	"id" serial PRIMARY KEY NOT NULL,
	"donor_id" integer NOT NULL,
	"monthly_amount" numeric(12, 2) NOT NULL,
	"head_id" integer,
	"due_day" integer DEFAULT 5 NOT NULL,
	"started_on" date NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pledges_donor_id_unique" UNIQUE("donor_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(40) NOT NULL,
	"name" varchar(80) NOT NULL,
	"description" text,
	"level" integer DEFAULT 50 NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"data_scope" "data_scope" DEFAULT 'own' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(60) PRIMARY KEY NOT NULL,
	"value" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(40) NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"email" varchar(160),
	"mobile" varchar(24),
	"password_hash" text NOT NULL,
	"role_id" integer NOT NULL,
	"manager_id" integer,
	"posted_at" varchar(80),
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_donor_id_donors_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_head_id_heads_id_fk" FOREIGN KEY ("head_id") REFERENCES "public"."heads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_collected_by_id_users_id_fk" FOREIGN KEY ("collected_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_voided_by_id_users_id_fk" FOREIGN KEY ("voided_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donors" ADD CONSTRAINT "donors_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_donor_id_donors_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_head_id_heads_id_fk" FOREIGN KEY ("head_id") REFERENCES "public"."heads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "donations_donor_idx" ON "donations" USING btree ("donor_id");--> statement-breakpoint
CREATE INDEX "donations_head_idx" ON "donations" USING btree ("head_id");--> statement-breakpoint
CREATE INDEX "donations_received_idx" ON "donations" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "donations_collector_idx" ON "donations" USING btree ("collected_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "donors_mobile_key" ON "donors" USING btree ("mobile");--> statement-breakpoint
CREATE INDEX "donors_name_idx" ON "donors" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "donors_legacy_idx" ON "donors" USING btree ("legacy_code");--> statement-breakpoint
CREATE INDEX "heads_parent_idx" ON "heads" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "notes_entity_idx" ON "notes" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "pledges_active_idx" ON "pledges" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "users_manager_idx" ON "users" USING btree ("manager_id");