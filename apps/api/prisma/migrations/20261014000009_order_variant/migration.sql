-- Referencia de variante en items (sin FK: la variante puede eliminarse y el recibo conserva variantLabel).
ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT;
