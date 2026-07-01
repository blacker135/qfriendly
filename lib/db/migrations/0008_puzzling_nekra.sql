ALTER TABLE "subscription_events" DROP CONSTRAINT "subscription_events_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "mrr_snapshots" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_events" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_events" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;