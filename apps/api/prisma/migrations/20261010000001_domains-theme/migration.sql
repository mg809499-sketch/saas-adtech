-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "domainStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "domainToken" TEXT,
ADD COLUMN     "domainVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "seo" JSONB,
ADD COLUMN     "theme" JSONB;

-- CreateTable
CREATE TABLE "DomainCheck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DomainCheck_tenantId_idx" ON "DomainCheck"("tenantId");

