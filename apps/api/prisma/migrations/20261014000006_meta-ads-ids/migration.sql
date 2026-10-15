-- Meta Ads Studio: business identifiers for real connection validation
ALTER TABLE "Tenant" ADD COLUMN     "metaBusinessId" TEXT,
ADD COLUMN     "metaAdAccount" TEXT,
ADD COLUMN     "metaPixel" TEXT;
