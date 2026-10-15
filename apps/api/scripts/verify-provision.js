const { PrismaClient } = require('@prisma/client');
(async () => {
  const p = new PrismaClient();
  try {
    const rows = await p.storeProvision.findMany({ take: 1 });
    console.log('CLIENT_OK:' + JSON.stringify(rows));
    const cols = await p.$queryRawUnsafe(
      "SELECT column_name FROM information_schema.columns WHERE table_name='Tenant' AND column_name='template'",
    );
    console.log('TEMPLATE_COL:' + JSON.stringify(cols));
  } finally {
    await p.$disconnect();
  }
})().catch((e) => {
  console.error('ERR:' + e.message);
  process.exit(1);
});
