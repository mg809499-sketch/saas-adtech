import { apiFetch } from "./api-client";
import type { ProductVariant } from "./api-client";

export interface Category { id: string; name: string; parentId: string | null; children?: Category[] }
export interface SizeGuide { id: string; name: string; kind: string; table: unknown }

export const listCategories = () => apiFetch<Category[]>("/categories");
export const createCategory = (name: string, parentId?: string) =>
  apiFetch<Category>("/categories", { method: "POST", body: JSON.stringify(parentId ? { name, parentId } : { name }) });
export const renameCategory = (id: string, name: string) =>
  apiFetch<Category>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
export const deleteCategory = (id: string) =>
  apiFetch(`/categories/${id}`, { method: "DELETE" });

export const listVariants = (productId: string) =>
  apiFetch<ProductVariant[]>(`/products/${productId}/variants`);
export const createVariant = (productId: string, body: { color?: string; size?: string; sku?: string; priceDelta?: number; stock?: number }) =>
  apiFetch<ProductVariant>(`/products/${productId}/variants`, { method: "POST", body: JSON.stringify(body) });
export const updateVariant = (id: string, body: { color?: string; size?: string; sku?: string; priceDelta?: number; stock?: number }) =>
  apiFetch<ProductVariant>(`/products/variants/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteVariant = (id: string) =>
  apiFetch(`/products/variants/${id}`, { method: "DELETE" });

export const listSizeGuides = () => apiFetch<SizeGuide[]>("/size-guides");
export const createSizeGuide = (body: { name: string; kind?: string; table?: unknown }) =>
  apiFetch<SizeGuide>("/size-guides", { method: "POST", body: JSON.stringify(body) });
export const deleteSizeGuide = (id: string) =>
  apiFetch(`/size-guides/${id}`, { method: "DELETE" });

// Guías base: ropa (XS–XXXL + mujer/hombre/niño como guías separadas) y calzado CO 34–45.
export const GUIDE_PRESETS: { name: string; kind: string; table: { sizes: string[] } }[] = [
  { name: "Ropa (general)", kind: "ropa", table: { sizes: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] } },
  { name: "Ropa mujer", kind: "ropa", table: { sizes: ["XS", "S", "M", "L", "XL", "XXL"] } },
  { name: "Ropa hombre", kind: "ropa", table: { sizes: ["S", "M", "L", "XL", "XXL", "XXXL"] } },
  { name: "Ropa niño", kind: "ropa", table: { sizes: ["2", "4", "6", "8", "10", "12", "14"] } },
  { name: "Calzado CO", kind: "calzado", table: { sizes: ["34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"] } },
];

export const guideSizes = (g: SizeGuide): string[] => {
  const t = g.table as { sizes?: unknown };
  return Array.isArray(t?.sizes) ? t.sizes.filter((s): s is string => typeof s === "string") : [];
};

export const variantLabel = (v: { color?: string | null; size?: string | null }) =>
  [v.color, v.size].filter(Boolean).join(" / ");
