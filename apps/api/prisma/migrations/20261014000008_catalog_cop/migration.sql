-- Catálogos: planes en COP + imagen, galería/categorías/variantes/guías de tallas.
ALTER TABLE "Plan" ADD COLUMN "priceMonthlyCop" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Plan" ADD COLUMN "imageUrl" TEXT;
UPDATE "Plan" SET "priceMonthlyCop" = "priceMonthlyUsd" * 4000;

ALTER TABLE "Product" ADD COLUMN "images" JSONB;
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;

CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Category_tenantId_parentId_name_key" ON "Category"("tenantId", "parentId", "name");
CREATE INDEX "Category_tenantId_idx" ON "Category"("tenantId");
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "color" TEXT,
    "size" TEXT,
    "sku" TEXT,
    "priceDelta" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

CREATE TABLE "SizeGuide" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'custom',
    "table" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SizeGuide_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SizeGuide" ADD CONSTRAINT "SizeGuide_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "SizeGuide_tenantId_name_key" ON "SizeGuide"("tenantId", "name");
CREATE INDEX "SizeGuide_tenantId_idx" ON "SizeGuide"("tenantId");

ALTER TABLE "OrderItem" ADD COLUMN "variantLabel" TEXT;
