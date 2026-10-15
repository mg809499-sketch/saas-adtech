-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "StorePage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PageStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreBlock" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "props" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StorePage_tenantId_idx" ON "StorePage"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "StorePage_tenantId_slug_key" ON "StorePage"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "StoreBlock_pageId_idx" ON "StoreBlock"("pageId");

-- AddForeignKey
ALTER TABLE "StorePage" ADD CONSTRAINT "StorePage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreBlock" ADD CONSTRAINT "StoreBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "StorePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

