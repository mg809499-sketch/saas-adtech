-- Aislamiento multi-tenant en profundidad: RLS + app-level.
-- La app fija app.tenant_id por transacción (PrismaService.withTenant).
-- Idempotente: seguro re-ejecutar.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation' AND tablename = 'User') THEN
    CREATE POLICY tenant_isolation ON "User" USING ("tenantId" = current_setting('app.tenant_id', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation' AND tablename = 'Product') THEN
    CREATE POLICY tenant_isolation ON "Product" USING ("tenantId" = current_setting('app.tenant_id', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation' AND tablename = 'Order') THEN
    CREATE POLICY tenant_isolation ON "Order" USING ("tenantId" = current_setting('app.tenant_id', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation' AND tablename = 'AdCampaign') THEN
    CREATE POLICY tenant_isolation ON "AdCampaign" USING ("tenantId" = current_setting('app.tenant_id', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation' AND tablename = 'StorePage') THEN
    CREATE POLICY tenant_isolation ON "StorePage" USING ("tenantId" = current_setting('app.tenant_id', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation' AND tablename = 'Subscription') THEN
    CREATE POLICY tenant_isolation ON "Subscription" USING ("tenantId" = current_setting('app.tenant_id', true));
  END IF;
END $$;

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AdCampaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdCampaign" FORCE ROW LEVEL SECURITY;
ALTER TABLE "StorePage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StorePage" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;
