ALTER TYPE "public"."subscription_status" ADD VALUE 'suspended';--> statement-breakpoint
CREATE TABLE "mrr_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"plan" text NOT NULL,
	"mrr_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"subscriber_count" integer DEFAULT 0 NOT NULL,
	"new_count" integer DEFAULT 0,
	"churn_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"plan" text NOT NULL,
	"billing_period" text,
	"amount" numeric(10, 2),
	"paypal_subscription_id" text NOT NULL,
	"previous_plan" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "analytics_events" DROP CONSTRAINT "analytics_events_user_id_fkey";
--> statement-breakpoint
DROP INDEX "idx_messages_conv_created";--> statement-breakpoint
DROP INDEX "idx_messages_conversation";--> statement-breakpoint
DROP INDEX "idx_events_type_created";--> statement-breakpoint
DROP INDEX "idx_daily_stats_date_key";--> statement-breakpoint
DROP INDEX "idx_monthly_stats_ym_key";--> statement-breakpoint
DROP INDEX "idx_retention_cohort_day";--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "tokens" integer;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mrr_date_plan" ON "mrr_snapshots" USING btree ("date","plan");--> statement-breakpoint
CREATE INDEX "idx_sub_events_user" ON "subscription_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_sub_events_type" ON "subscription_events" USING btree ("event_type","created_at");--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_messages_conv_created" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_events_type_created" ON "analytics_events" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_daily_stats_date_key" ON "analytics_daily_stats" USING btree ("date","metric_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_monthly_stats_ym_key" ON "analytics_monthly_stats" USING btree ("year_month","metric_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_retention_cohort_day" ON "analytics_retention" USING btree ("cohort_date","day_n");