-- CreateTable
CREATE TABLE "channel_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "services" JSONB NOT NULL DEFAULT '[]',
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "working_hours" TEXT NOT NULL,
    "rules" TEXT,
    "whatsapp_instance" TEXT,
    "instagram_page_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_configs_tenant_id_key" ON "channel_configs"("tenant_id");

-- AddForeignKey
ALTER TABLE "channel_configs" ADD CONSTRAINT "channel_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
