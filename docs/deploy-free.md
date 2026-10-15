# Despliegue $0 — vitrinas por dominio + central GrowUp

Arquitectura: una sola app Next.js (ruteo por `host` en middleware), Route
Handlers públicos con caché, Postgres central en Supabase (misma app, `tenant.id`
es el `store_id`), Upstash Redis (mapa slug/dominio→tenant + throttle),
API NestJS en hosting free con warm-up, Cloudflare para DNS + wildcard TLS.

## 1. Supabase (BD central)

1. Crea el proyecto (free) y copia la **connection string del pooler**
   (puerto 6543, modo transaction) + `service_role` (solo server).
2. Aplica el esquema existente (incluye RLS `tenant_isolation` con `FORCE`):
   `DATABASE_URL=<pooler-superuser> npx prisma migrate deploy` (desde `apps/api`).
3. Migra datos tienda por tienda (roundtrip ya existente):
   `GET /stores/:id/export` (origen) → `POST /admin/tenants/import` (destino,
   con `SYSTEM_DATABASE_URL` al pooler).
4. `npx prisma db seed` para planes. Verifica aislamiento: `npm test`
   (cross-tenant 4/4) apuntando a Supabase.
5. RLS: la app corre con `growup_app`-equivalente (crea el rol via
   `scripts/setup-app-role.js` adaptado) — nunca superuser en runtime,
   salvo `SYSTEM_DATABASE_URL` para login/vitrina/admin/cron.

## 2. Upstash Redis

1. Crea DB (free) en la misma región que Vercel/Supabase. Copia
   `UPSTASH_REDIS_REST_URL/TOKEN` (edge, `lib/storefront.ts`) y el endpoint
   TCP `rediss://` como `REDIS_URL` del API (`ioredis` lo acepta sin cambios).
2. Claves: `gs:slug:<slug>` y `gs:domain:<dominio>` → `{tenantId, storeSlug}`,
   TTL 3600. Se invalidan al publicar (ver `invalidateStore`) y al
   vincular/desvincular dominio.
3. Límite 10k cmds/día: el middleware solo lee caché; el fallback al API
   escribe solo en hit válido.

## 3. Vercel (web, mismo repo)

1. Importa `apps/web`, envs: `NEXT_PUBLIC_SITE_DOMAIN=growupstore.app`,
   `NEXT_PUBLIC_SITE_URL=https://growupstore.app`,
   `NEXT_PUBLIC_API_URL=https://<api>/api/v1`, Upstash REST, Supabase
   anon (solo lectura pública si se usa en cliente; el server usa service-role).
2. Dominios: apex + `*.growupstore.app`. Custom domains de clientes se
   agregan en el dashboard (o API) tras `domainStatus=VERIFIED`.
3. El middleware reescribe `<slug>.apex/...` → `/s/[slug]/...` y manda
   `/consola,/admin,/login,/checkout,/planes,/mis-pedidos,/pedido` al principal.

## 4. API NestJS (cualquier hosting free con Docker o Node)

| Opción | $0 real | Notas |
|---|---|---|
| **Fly.io** (recomendado) | Sí: 3 VMs shared + auto-stop | `fly launch` usa `apps/api/fly.toml` (lax, junto a Supabase us-west-2); `fly secrets set` con las envs; despierta solo |
| Render | Sí (duerme) | `render.yaml` en la raíz (Blueprint); warm-up cada 10 min a `/api/v1/billing/plans` |
| Railway | Trial con créditos | Sin archivos extra: conecta el repo, root `apps/api`, mismo build/start; no es free permanente |
| Koyeb | Free con límites | Usa `apps/api/Dockerfile` directo |
| AWS | No free sostenido | EC2 free expira 12m + ALB/NAT cuestan; solo si se sale del free |

Envs (iguales en todos): `DATABASE_URL` (pooler `growup_app`), `SYSTEM_DATABASE_URL`
(pooler `postgres.<ref>`), `REDIS_URL` (TCP Upstash `rediss://`), `JWT_SECRET/REFRESH`,
`AES_SERVICE_KEY` (nuevo de prod), `BOLD_WEBHOOK_SECRET`, `MOCK_PAYMENTS=false`,
`STORE_DOMAIN`, `INTERNAL_EDGE_SECRET`, `PORT=3000`.

1. Servicio Node con `npm run build` + `node dist/src/main.js`; envs del
   `.env.example` apuntando a Supabase/Upstash; `MOCK_PAYMENTS=false` en prod.
2. Warm-up: cron externo cada 10 min a `GET /api/v1/billing/plans`
   (el free tier duerme; el primer checkout paga el cold start).
3. Webhook Bold: URL pública `/api/v1/...` con HMAC (`BOLD_WEBHOOK_SECRET`).

## 5. Cloudflare

1. NS del dominio a Cloudflare; `A @` + `A *.growupstore.app` al destino
   (Vercel: CNAME a `cname.vercel-dns.com` según guía de Vercel).
2. TLS automático (reemplaza Caddy/`caddy-ask`); TXT `_growup-verify`
   por tienda para `POST /stores/:id/domain/verify`.

## 6. Verificación

- `mitienda.growupstore.app/` pinta la vitrina (rewrite, sin redirect).
- Host desconocido → `https://growupstore.app/tiendas`.
- `/consola` en host de tienda → principal con `next`.
- Checkout + webhook firmado de punta a punta; expiración de reservas (cron).
- Plan sin suscripción vigente → 403 `plan_required` (PlanGuard intacto).
