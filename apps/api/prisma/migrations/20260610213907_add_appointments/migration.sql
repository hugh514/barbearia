-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('AGUARDANDO', 'EM_ATENDIMENTO', 'FINALIZADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "barber_id" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'AGUARDANDO',
    "services" TEXT[],
    "total_price" DECIMAL(10,2),
    "notes" TEXT,
    "cancel_reason" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointments_tenant_id_status_idx" ON "appointments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_barber_id_idx" ON "appointments"("tenant_id", "barber_id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_customer_id_idx" ON "appointments"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_created_at_idx" ON "appointments"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
