-- Guards de concorrência para a fila walk-in (auditoria: R1, R3).
-- Índices únicos PARCIAIS (não expressáveis no schema.prisma DSL) — enforce no banco.

-- R1: no máximo um atendimento ativo (AGUARDANDO/EM_ATENDIMENTO) por cliente/tenant.
-- Impede check-ins concorrentes de criarem atendimentos duplicados para o mesmo cliente.
CREATE UNIQUE INDEX "uniq_active_appt_per_customer"
  ON "appointments" ("tenant_id", "customer_id")
  WHERE "status" IN ('AGUARDANDO', 'EM_ATENDIMENTO') AND "deleted_at" IS NULL;

-- R3: no máximo um atendimento EM_ATENDIMENTO por barbeiro/tenant.
-- Impede TOCTOU ao iniciar atendimentos simultâneos com o mesmo barbeiro.
CREATE UNIQUE INDEX "uniq_active_appt_per_barber"
  ON "appointments" ("tenant_id", "barber_id")
  WHERE "status" = 'EM_ATENDIMENTO' AND "deleted_at" IS NULL AND "barber_id" IS NOT NULL;
