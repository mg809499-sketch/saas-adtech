// Pre-chequeo antes de `prisma migrate dev` (migración 000901: índice único
// compuesto [tenantId, idempotencyKey]).
// Uso: DATABASE_URL=postgresql://... node scripts/check-idempotency-duplicates.js
// Salida 0 = sin duplicados (seguro migrar). Salida 1 = hay que reconciliar.
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const dupTenant = await prisma.$queryRawUnsafe(
      `SELECT "tenantId", "idempotencyKey", COUNT(*)::int AS c FROM "Order" GROUP BY 1, 2 HAVING COUNT(*) > 1 LIMIT 20`,
    );
    const cross = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS c FROM (SELECT "idempotencyKey" FROM "Order" GROUP BY 1 HAVING COUNT(DISTINCT "tenantId") > 1) t`,
    );
    console.log(JSON.stringify({ dupWithinTenant: dupTenant, crossTenantKeys: cross }, null, 2));
    const bad = dupTenant.length > 0;
    if (bad) {
      console.error('BLOQUEADO: reconcilia idempotencyKey duplicados dentro del mismo tenant antes de migrar.');
      process.exitCode = 1;
    } else {
      console.log('OK: sin duplicados intra-tenant. Las claves cross-tenant (si las hay) quedan separadas por el índice compuesto.');
    }
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error('DBERR: ' + e.message);
  process.exitCode = 2;
});
