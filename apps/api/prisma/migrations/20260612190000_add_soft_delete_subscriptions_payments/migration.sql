-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "deleted_at" TIMESTAMP(3);
