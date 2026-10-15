const { PrismaClient } = require('@prisma/client');
(async () => {
  const p = new PrismaClient();
  try {
    const m = await p.$queryRawUnsafe(
      'SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC NULLS LAST LIMIT 4',
    );
    console.log('LAST:' + JSON.stringify(m.map((r) => r.migration_name)));
    const pol = await p.$queryRawUnsafe(
      "SELECT tablename FROM pg_policies WHERE policyname='tenant_isolation' ORDER BY 1",
    );
    console.log('POLICIES:' + JSON.stringify(pol.map((r) => r.tablename)));
    const idx = await p.$queryRawUnsafe(
      "SELECT indexname FROM pg_indexes WHERE tablename='Order' AND indexname LIKE '%dempotency%'",
    );
    console.log('INDEX:' + JSON.stringify(idx.map((r) => r.indexname)));
    const tenants = await p.tenant.findMany({ select: { slug: true } });
    console.log('TENANTS:' + JSON.stringify(tenants.map((t) => t.slug)));
  } finally {
    await p.$disconnect();
  }
})().catch((e) => {
  console.error('ERR:' + e.message);
  process.exit(1);
});
