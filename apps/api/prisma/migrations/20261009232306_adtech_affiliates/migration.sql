-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "AffStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "dailyBudget" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "targeting" JSONB,
    "metaCampaignId" TEXT,
    "metaAdsetId" TEXT,
    "metaAdId" TEXT,
    "status" "AdStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateAgreement" (
    "id" TEXT NOT NULL,
    "sourceTenantId" TEXT NOT NULL,
    "targetTenantId" TEXT NOT NULL,
    "commissionPct" INTEGER NOT NULL,
    "status" "AffStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdCampaign_tenantId_idx" ON "AdCampaign"("tenantId");

-- CreateIndex
CREATE INDEX "AffiliateAgreement_sourceTenantId_idx" ON "AffiliateAgreement"("sourceTenantId");

-- CreateIndex
CREATE INDEX "AffiliateAgreement_targetTenantId_idx" ON "AffiliateAgreement"("targetTenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateAgreement_sourceTenantId_targetTenantId_key" ON "AffiliateAgreement"("sourceTenantId", "targetTenantId");

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
