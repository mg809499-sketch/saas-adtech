-- Idempotencia con alcance tenant: evita colisión cross-tenant del @unique global.
-- Pre-requisito: no deben existir dos órdenes con mismo idempotencyKey en distinto tenant
-- con valores duplicados dentro del mismo tenant (el servicio ya lo garantiza hacia adelante).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Order_idempotencyKey_key') THEN
    DROP INDEX "Order_idempotencyKey_key";
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_tenantId_idempotencyKey_key" ON "Order"("tenantId", "idempotencyKey");
