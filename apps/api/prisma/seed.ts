import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PRODUCTS = [
  { name: 'Zapatillas Pro Runner Nitro', slug: 'zapatillas-pro-runner-nitro', sku: 'SKU-RUN-8821-42', description: 'Amortiguación nitro para running diario.', price: 389000, compareAtPrice: 329000, stock: 34, category: 'Calzado' },
  { name: 'Camiseta Compresión Elite', slug: 'camiseta-compresion-elite', sku: 'SKU-CMP-1049-M', description: 'Compresión transpirable talla M.', price: 125000, compareAtPrice: null, stock: 4, category: 'Ropa Deportiva' },
  { name: 'Mancuerna Hexagonal 15kg', slug: 'mancuerna-hexagonal-15kg', sku: 'SKU-FIT-9015-EA', description: 'Hierro recubierto, agarre antideslizante.', price: 195000, compareAtPrice: 175000, stock: 18, category: 'Accesorios' },
  { name: 'Proteína IsoClean 2lb Vainilla', slug: 'proteina-isoclean-2lb-vainilla', sku: 'SKU-NUT-3022-VN', description: 'Aislado de suero, 25g por porción.', price: 240000, compareAtPrice: 219000, stock: 52, category: 'Suplementos' },
  { name: 'Straps GripMax', slug: 'straps-gripmax', sku: 'SKU-ACC-5520-UN', description: 'Straps de levantamiento reforzados.', price: 45000, compareAtPrice: null, stock: 2, category: 'Accesorios' },
];

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'growup-demo' },
    update: {},
    create: { name: 'Mi Tienda Deportiva (tenant demo)', slug: 'growup-demo' },
  });
  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: p.slug } },
      update: { price: p.price, compareAtPrice: p.compareAtPrice, stock: p.stock },
      create: { tenantId: tenant.id, status: 'PUBLISHED', ...p },
    });
  }
  const hash = await bcrypt.hash('demo1234', 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'demo@growupstore.co' } },
    update: {},
    create: { tenantId: tenant.id, email: 'demo@growupstore.co', name: 'Cliente Demo', passwordHash: hash, role: 'CUSTOMER' },
  });
  const adminHash = await bcrypt.hash('admin1234', 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@growupstore.co' } },
    update: {},
    create: { tenantId: tenant.id, email: 'admin@growupstore.co', name: 'Comercio Demo', passwordHash: adminHash, role: 'MERCHANT' },
  });
  const superHash = await bcrypt.hash('super1234', 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'superadmin@growupstore.co' } },
    update: {},
    create: { tenantId: tenant.id, email: 'superadmin@growupstore.co', name: 'Plataforma GrowUp', passwordHash: superHash, role: 'ADMIN' },
  });
  // eslint-disable-next-line no-console
  console.log(`seed OK tenant=${tenant.id} (demo@growupstore.co / demo1234)`);

  // Planes y suscripciones demo.
  await prisma.plan.upsert({
    where: { slug: 'STARTER' },
    update: {},
    create: { slug: 'STARTER', name: 'Starter', priceMonthlyUsd: 29, maxStores: 1, maxProducts: 100, features: { ads: false, affiliates: false } },
  });
  await prisma.plan.upsert({
    where: { slug: 'SCALE_PRO' },
    update: {},
    create: { slug: 'SCALE_PRO', name: 'Scale Pro', priceMonthlyUsd: 79, maxStores: 3, maxProducts: -1, features: { ads: true, affiliates: true } },
  });
  await prisma.plan.upsert({
    where: { slug: 'ENTERPRISE' },
    update: {},
    create: { slug: 'ENTERPRISE', name: 'Enterprise DTC', priceMonthlyUsd: 199, maxStores: 5, maxProducts: -1, features: { ads: true, affiliates: true, multistore: true } },
  });
  const adminUser = await prisma.user.findUniqueOrThrow({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@growupstore.co' } },
  });
  await prisma.tenant.update({ where: { id: tenant.id }, data: { ownerId: adminUser.id, storeName: 'Mi Tienda Deportiva', storeSlug: 'mitiendadeportiva' } });
  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: { planSlug: 'SCALE_PRO', status: 'ACTIVE' },
    create: { tenantId: tenant.id, planSlug: 'SCALE_PRO', status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000) },
  });

  // Segunda tienda para probar la Red Aliada.
  const aliada = await prisma.tenant.upsert({
    where: { slug: 'growup-aliada' },
    update: {},
    create: { name: 'Tienda Aliada Demo', slug: 'growup-aliada' },
  });
  await prisma.product.upsert({
    where: { tenantId_slug: { tenantId: aliada.id, slug: 'gorra-tech-uv' } },
    update: {},
    create: { tenantId: aliada.id, name: 'Gorra Tech UV', slug: 'gorra-tech-uv', sku: 'SKU-ALI-UV01', description: 'Protección UV para running.', price: 65000, compareAtPrice: null, stock: 40, category: 'Accesorios', status: 'PUBLISHED' },
  });
  const aliadaHash = await bcrypt.hash('aliada1234', 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: aliada.id, email: 'aliada@growupstore.co' } },
    update: {},
    create: { tenantId: aliada.id, email: 'aliada@growupstore.co', name: 'Aliada Demo', passwordHash: aliadaHash, role: 'MERCHANT' },
  });
  const aliadaUser = await prisma.user.findUniqueOrThrow({
    where: { tenantId_email: { tenantId: aliada.id, email: 'aliada@growupstore.co' } },
  });
  await prisma.tenant.update({ where: { id: aliada.id }, data: { ownerId: aliadaUser.id, storeName: 'Tienda Aliada Demo', storeSlug: 'tienda-aliada' } });
  await prisma.subscription.upsert({
    where: { tenantId: aliada.id },
    update: { planSlug: 'STARTER', status: 'TRIALING' },
    create: { tenantId: aliada.id, planSlug: 'STARTER', status: 'TRIALING', currentPeriodEnd: new Date(Date.now() + 14 * 24 * 3600 * 1000) },
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
