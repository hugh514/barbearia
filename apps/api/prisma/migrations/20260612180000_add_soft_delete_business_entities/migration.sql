-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "messages" ADD COLUMN "deleted_at" TIMESTAMP(3);
