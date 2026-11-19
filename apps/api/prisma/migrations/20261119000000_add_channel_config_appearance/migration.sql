-- Aparência por barbearia: cor da marca e tema.
ALTER TABLE "channel_configs"
  ADD COLUMN "brand_color" TEXT NOT NULL DEFAULT '#1F4FB8',
  ADD COLUMN "theme_mode" TEXT NOT NULL DEFAULT 'light';
