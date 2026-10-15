import { z } from "zod";

// Única verdad DTO api <-> web. El backend re-exporta estos schemas
// en sus *.dto.ts; el frontend los usa para validar formularios.

export const EmailSchema = z.string().email().max(160);
export const PasswordSchema = z.string().min(8).max(128);

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().min(1).max(120).optional(),
  storeSlug: z.string().min(2).max(60).optional(),
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const CreateProductSchema = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().min(2).max(80).optional(),
  sku: z.string().min(2).max(60),
  description: z.string().max(2000).optional(),
  price: z.number().int().min(0),
  compareAtPrice: z.number().int().min(0).optional(),
  stock: z.number().int().min(0).default(0),
  category: z.string().max(80).default("General"),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED"),
});
export type CreateProductDto = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;

export const ShippingSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(6).max(30),
  address: z.string().min(5).max(240),
  city: z.string().min(2).max(120),
});
export type Shipping = z.infer<typeof ShippingSchema>;

export const CheckoutSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
  shipping: ShippingSchema,
  paymentMethod: z.enum(["PSE", "CARD", "NEQUI"]),
  payment: z.object({ cardNumber: z.string().max(24).optional() }).passthrough().optional(),
  idempotencyKey: z.string().uuid().optional(),
});
export type CheckoutDto = z.infer<typeof CheckoutSchema>;

export const MockConfirmSchema = z.object({
  orderId: z.string().min(1),
  approve: z.boolean().default(true),
});

export const PaginationSchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const CreateCampaignSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(3).max(120).optional(),
  dailyBudget: z.number().min(5),
  targeting: z.record(z.unknown()).optional(),
});

export const RequestAgreementSchema = z.object({
  targetSlug: z.string().min(2).max(80),
  commissionPct: z.number().int().min(1).max(35),
});

// Precio que se cobra: SIEMPRE price. compareAtPrice es solo display tachado.
export function chargeablePrice(p: { price: number }): number {
  return p.price;
}
