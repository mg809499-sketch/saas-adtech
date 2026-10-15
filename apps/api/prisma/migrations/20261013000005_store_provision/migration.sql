-- Alta idempotente de tiendas (F7) + plantilla base (F8).
-- Solo ADD/CREATE: sin backfill, sin downtime.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProvisionStatus') THEN
    CREATE TYPE "ProvisionStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED');
  END IF;
END $$;

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "template" TEXT;

CREATE TABLE IF NOT EXISTS "StoreProvision" (
  "idempotencyKey" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "tenantId" TEXT,
  "template" TEXT NOT NULL DEFAULT 'minimal',
  "status" "ProvisionStatus" NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoreProvision_pkey" PRIMARY KEY ("idempotencyKey")
);
CREATE INDEX IF NOT EXISTS "StoreProvision_ownerId_idx" ON "StoreProvision"("ownerId");
