// Purga de datos demo/test. SOLO lectura por defecto (dry-run).
// Ejecución real: DATABASE_URL=<superuser> node scripts/purge-demo-data.js --execute
// Usa rol superuser (SYSTEM_DATABASE_URL) para saltar el RLS.
// Protegido: nunca toca las 4 cuentas seed, sus tenants, thewinners8 ni planes.
const { PrismaClient } = require('@prisma/client');

const SEED_EMAILS = new Set([
  'demo@growupstore.co',
  'admin@growupstore.co',
  'superadmin@growupstore.co',
  'aliada@growupstore.co',
]);
// Tiendas de prueba a eliminar (por storeSlug). Se conservan:
// mitiendadeportiva, tienda-aliada, thewinners8.
const DOOMED_STORE_SLUGS = new Set([
  'tienda-vacia-x9',
  'journey-store-x1',
  'tienda-nuevo-test',
  'httpswwwthewinners8com',
]);
// Slugs de productos seed (demo + aliada).
const SEED_PRODUCT_SLUGS = new Set([
  'zapatillas-pro-runner-nitro',
  'camiseta-compresion-elite',
  'mancuerna-hexagonal-15kg',
  'proteina-isoclean-2lb-vainilla',
  'straps-gripmax',
  'gorra-tech-uv',
]);
const EXECUTE = process.argv.includes('--execute');

(async () => {
  const p = new PrismaClient();
  const plan = { orders: [], products: [], agreements: [], checks: [], provisions: [], tenants: [], users: [] };
  try {
    const tenants = await p.tenant.findMany({ select: { id: true, slug: true, storeSlug: true, storeName: true, ownerId: true } });
    const byId = new Map(tenants.map((t) => [t.id, t]));
    const keptSlugs = new Set(['mitiendadeportiva', 'tienda-aliada', 'thewinners8']);
    const doomed = tenants.filter((t) => t.storeSlug && DOOMED_STORE_SLUGS.has(t.storeSlug));
    const kept = tenants.filter((t) => t.storeSlug && keptSlugs.has(t.storeSlug));
    const keptIds = new Set(kept.map((t) => t.id));
    const doomedIds = new Set(doomed.map((t) => t.id));
    const keptOwnerIds = new Set(kept.map((t) => t.ownerId).filter(Boolean));

    // 1. Pedidos de prueba: todos los de tenants conservados demo/aliada
    // (el seed no crea pedidos; mitiendadeportiva=4, resto 0 esperado).
    for (const t of kept) {
      const orders = await p.order.findMany({ where: { tenantId: t.id }, select: { id: true, status: true, total: true } });
      for (const o of orders) plan.orders.push({ id: o.id, tenant: t.storeSlug, status: o.status, total: o.total });
    }
    // 2. Productos seed en tenants conservados (reporta no-seed y los conserva).
    for (const t of kept) {
      const prods = await p.product.findMany({ where: { tenantId: t.id }, select: { id: true, slug: true, name: true } });
      for (const pr of prods) {
        if (SEED_PRODUCT_SLUGS.has(pr.slug)) plan.products.push({ id: pr.id, tenant: t.storeSlug, slug: pr.slug });
        else plan.products.push({ id: pr.id, tenant: t.storeSlug, slug: pr.slug, KEEP: 'no es seed: se conserva' });
      }
    }
    // 3. Acuerdos/domainChecks/provisions ligados a tiendas condenadas.
    const [agreements, checks, provisions] = await Promise.all([
      p.affiliateAgreement.findMany(),
      p.domainCheck.findMany({ where: { tenantId: { in: [...doomedIds] } } }),
      p.storeProvision.findMany({ where: { tenantId: { in: [...doomedIds] } } }),
    ]);
    for (const a of agreements) {
      if (doomedIds.has(a.sourceTenantId) || doomedIds.has(a.targetTenantId)) {
        plan.agreements.push({ id: a.id, status: a.status, src: byId.get(a.sourceTenantId)?.storeSlug, dst: byId.get(a.targetTenantId)?.storeSlug });
      }
    }
    for (const c of checks) plan.checks.push({ id: c.id, tenant: byId.get(c.tenantId)?.storeSlug });
    for (const pv of provisions) plan.provisions.push({ key: pv.idempotencyKey, tenant: byId.get(pv.tenantId || '')?.storeSlug });
    for (const t of doomed) plan.tenants.push({ id: t.id, slug: t.storeSlug });
    // 4. Usuarios no-seed que no sean dueños de tenants conservados.
    const users = await p.user.findMany({ select: { id: true, email: true, role: true, tenantId: true } });
    for (const u of users) {
      if (!SEED_EMAILS.has(u.email.toLowerCase()) && !keptOwnerIds.has(u.id)) {
        plan.users.push({ id: u.id, email: u.email, role: u.role });
      }
    }

    console.log('DRY-RUN=' + (!EXECUTE));
    console.log(JSON.stringify(plan, null, 1));
    const delProducts = plan.products.filter((x) => !x.KEEP);
    console.log(`RESUMEN: pedidos=${plan.orders.length} productos_seed=${delProducts.length} acuerdos=${plan.agreements.length} checks=${plan.checks.length} provisions=${plan.provisions.length} tiendas=${plan.tenants.length} usuarios=${plan.users.length}`);
    if (!EXECUTE) { console.log('Sin --execute no se borra nada.'); return; }

    // Ejecución en orden seguro para FK (el resto cae en cascada del tenant).
    const orderIds = plan.orders.map((o) => o.id);
    if (orderIds.length) {
      await p.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await p.paymentAttempt.deleteMany({ where: { orderId: { in: orderIds } } });
      await p.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (delProducts.length) await p.product.deleteMany({ where: { id: { in: delProducts.map((x) => x.id) } } });
    if (plan.agreements.length) await p.affiliateAgreement.deleteMany({ where: { id: { in: plan.agreements.map((x) => x.id) } } });
    if (plan.checks.length) await p.domainCheck.deleteMany({ where: { id: { in: plan.checks.map((x) => x.id) } } });
    if (plan.provisions.length) await p.storeProvision.deleteMany({ where: { idempotencyKey: { in: plan.provisions.map((x) => x.key) } } });
    for (const t of plan.tenants) await p.tenant.delete({ where: { id: t.id } });
    if (plan.users.length) await p.user.deleteMany({ where: { id: { in: plan.users.map((x) => x.id) } } });
    console.log('PURGE-OK');
  } finally {
    await p.$disconnect();
  }
})().catch((e) => { console.error('ERR:' + e.message); process.exit(1); });
