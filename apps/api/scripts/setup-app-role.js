// One-time (superuser): crea el rol de aplicación sin superuser para que RLS
// sea vinculante también en el path de la app (los superusers hacen bypass
// de RLS incluso con FORCE). Transfiere ownership de tablas/secuencias y
// deja default privileges para objetos futuros.
// Uso (como postgres superuser): DATABASE_URL=postgresql://postgres:... node scripts/setup-app-role.js
const { PrismaClient } = require('@prisma/client');

const APP_USER = process.env.APP_DB_USER || 'growup_app';
const APP_PASSWORD = process.env.APP_DB_PASSWORD || 'growup_app_dev';

(async () => {
  const p = new PrismaClient();
  try {
    await p.$executeRawUnsafe(
      'DO $b$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=' +
        "'" + APP_USER + "') THEN CREATE ROLE " + APP_USER + " LOGIN PASSWORD '" + APP_PASSWORD + "'; " +
        'ELSE ALTER ROLE ' + APP_USER + " LOGIN PASSWORD '" + APP_PASSWORD + "'; END IF; END $b$;",
    );
    await p.$executeRawUnsafe('GRANT CONNECT ON DATABASE growupstore TO ' + APP_USER);
    await p.$executeRawUnsafe('GRANT USAGE, CREATE ON SCHEMA public TO ' + APP_USER);
    const tables = await p.$queryRawUnsafe(
      "SELECT tablename FROM pg_tables WHERE schemaname='public'",
    );
    for (const t of tables) {
      await p.$executeRawUnsafe(`ALTER TABLE "${t.tablename}" OWNER TO ${APP_USER}`);
    }
    const seqs = await p.$queryRawUnsafe(
      "SELECT sequencename FROM pg_sequences WHERE schemaname='public'",
    );
    for (const s of seqs) {
      await p.$executeRawUnsafe(`ALTER SEQUENCE "${s.sequencename}" OWNER TO ${APP_USER}`);
    }
    await p.$executeRawUnsafe(
      `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO ${APP_USER}`,
    );
    await p.$executeRawUnsafe(
      `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO ${APP_USER}`,
    );
    await p.$executeRawUnsafe(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${APP_USER} IN SCHEMA public GRANT ALL ON TABLES TO ${APP_USER}`,
    );
    console.log(`OK: rol ${APP_USER} listo, ownership transferido (${tables.length} tablas, ${seqs.length} secuencias).`);
    console.log(`DATABASE_URL=postgresql://${APP_USER}:${APP_PASSWORD}@localhost:5433/growupstore`);
  } finally {
    await p.$disconnect();
  }
})().catch((e) => {
  console.error('ERR: ' + e.message);
  process.exit(1);
});
