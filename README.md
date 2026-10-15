# GrowUp Store — SaaS AdTech (monorepo)

- `apps/web`: Next.js 14 + Tailwind (landing, vitrinas `/s/[slug]`, checkout, consola comercio, consola plataforma; `:3001`).
- `apps/api`: NestJS 10 + Prisma + PostgreSQL (IAM JWT, catálogo, checkout, webhooks Bold HMAC, AdTech, afiliados, endpoints admin; `:3002/api/v1`).

## Dev rápido
```
docker compose up -d postgres redis   # PG :5433, Redis :6380
cd apps/api && npm install --ignore-scripts
npx prisma migrate deploy             # 13 migraciones (incl. RLS FORCE)
node scripts/setup-app-role.js        # crea rol growup_app (superuser, una vez)
npx prisma db seed                    # con DATABASE_URL de superuser (SYSTEM_...)
npx tsc -p tsconfig.json && node dist/src/main.js   # :3002
cd ../web && pnpm install && pnpm dev                # :3001
```
La app corre con `DATABASE_URL` del rol `growup_app` (sin superuser: RLS vinculante).
`SYSTEM_DATABASE_URL` (superuser local) solo para login global, vitrina, admin, cron y seed.
Cuentas demo: `demo@growupstore.co / demo1234` (comercio thewinners8), `admin@growupstore.co / admin1234` (Mi Tienda Deportiva), `aliada@growupstore.co / aliada1234` (Tienda Aliada), `superadmin@growupstore.co / super1234` (plataforma `/admin` y `/consola/plataforma`).

## Seguridad
- JWT con claims `sub, tenant_id, role`; `JwtAuthGuard + TenantGuard` en todo endpoint privado (mismatch → 403). Rutas plataforma con `RolesGuard` (solo ADMIN).
- Secretos (Bold, Meta, snapshot de envío) cifrados **AES-256-GCM** en BD; la API solo expone máscaras (`xpk_••••9ae3`).
- Webhook Bold verifica **HMAC-SHA256** del `rawBody` con `timingSafeEqual` + idempotencia por `event_id`.
- Aislamiento multi-tenant en **dos capas**: aplicación (`withTenant(tenantId)` + guards en cada query) y **RLS Postgres con `FORCE`** en `User/Product/Order/AdCampaign/StorePage/Subscription` (`SET app.tenant_id` por transacción). La app corre como rol `growup_app` (no-superuser: RLS vinculante); flujos cross-tenant explícitos (login global, vitrina, admin, cron) usan cliente system con `SYSTEM_DATABASE_URL`.
- Alta de tiendas idempotente (`Idempotency-Key` + `StoreProvision`), slug con hold Redis + `@@unique`, plantillas `minimal|catalog|landing`, checklist `GET /stores/:id/onboarding`, export/import por tenant (`GET /stores/:id/export`, `POST /admin/tenants/import`).
- Visualizador sin código en `/consola/sitio/visualizador`: lienzo neutro (sin clases `gs-*`), 10 contenedores con placeholders (incl. `boton` CTA a catálogo/oferta), drag & drop, plantillas base vía `POST /pages/:id/apply-template`. Ancla `#catalogo` en el bloque `productos`.
- `POST /orders/mock-confirm` solo existe con `MOCK_PAYMENTS=true` (demo local); en prod la confirmación llega por webhook firmado.
- Tests: `npx jest` en `apps/api` (AES, HMAC, aislamiento cross-tenant 4/4, provisioning 4/4). CI: `.github/workflows/ci.yml` (lint+test+build+**gitleaks**). SAST/Strix/Sonar: pendientes de credenciales del servicio; el pipeline deja el stage listo.

## Consolas y roles
- **Comercio** (`MERCHANT`, o `CUSTOMER` con tienda): `/consola/*` — dashboard, catálogo, órdenes, Meta Ads, red aliada, sitio, pasarelas, dominio, ajustes. Badge de rol + `StoreSwitcher` en el header.
- **Plataforma** (`ADMIN`): `/consola/plataforma/*` con el mismo sidebar — panorama, tiendas clientes (suspender/reactivar/eliminar, usuarios y roles), compras y suscripciones (crear/editar/renovar/eliminar + historial), planes y permisos (CRUD, precio COP, imagen), Meta Ads (bandeja `PENDING_REVIEW` + aprobar/rechazar con nota), red (aprobar/revocar/editar/eliminar), pasarelas (tablero enmascarado + revocar), dominios y API, ajustes GrowUp (`SiteSetting`), auditoría (`AuditLog`). Sin Mi sitio, Personalizar, Crear tienda ni Catálogo. `/admin/*` sigue como redirect compatible.
- Middleware + layouts blindan: `/consola/plataforma/*` solo ADMIN; ADMIN en rutas comercio → plataforma; CUSTOMER sin tienda → `/tiendas`.

## Catálogo, planes y moneda
- Planes en **COP** (`priceMonthlyCop`, backfill USD×4000) + `imageUrl` en tarjetas; checkout cobra COP y guarda `{amount, currency, method}` en el evento.
- Productos: galería (`imageUrl` + `images[]`), descripción, categorías con subcategorías (`Category` árbol 2 niveles), variantes (`ProductVariant`: color/talla/SKU/delta/stock) y guías de tallas (`SizeGuide`: ropa/calzado/custom).
- Checkout acepta `variantId` (valida, cobra base+delta, descuenta stock de la variante, guarda `variantLabel`); fallos/expiración liberan la variante. Vitrina con selector color/talla, galería y carrito por línea de variante.

## Hosting $0 (ver `docs/deploy-free.md`)
- **Web (Vercel, mismo repo)**: `middleware.ts` host-first — `<slug>.growupstore.app` y custom domains verificados → rewrite a `/s/[slug]/...`; consola/admin solo en dominio principal. Lookup en Upstash (`gs:slug:*`, `gs:domain:*`, TTL 3600) con fallback al API + `invalidateStore` al publicar.
- **Lecturas públicas**: Route Handlers `app/api/storefront/[slug]/*` con `revalidate` 60s.
- **BD central (Supabase, PG 17)**: se portan `schema.prisma` + 13 migraciones; RLS intacto (`tenant.id` = `store_id`, nada que renombrar); datos vía export/import por tienda.
- **API NestJS**: `apps/api/Dockerfile` (pnpm deploy, engines `debian-openssl-3.0.x`, openssl+CA) + `fly.toml` (auto-stop) o `render.yaml` (Blueprint); `REDIS_URL` al endpoint TCP de Upstash (`ioredis` sin cambios); warm-up cada 10 min.
- **DNS/TLS (Cloudflare)**: apex + `*.growupstore.app`; TXT `_growup-verify` por tienda (jubila Caddy).
- **CLIs conectados**: `vercel` (proyecto linkeado), `@upstash/cli` (DB `growup-slugs`), `supabase`, `wrangler`. Secretos solo en envs (Vercel/Render), jamás en el repo.

## Puertos locales (otros proyectos ocupan los estándar)
PG `5433`, Redis `6380`, API `3002`, web `3001`.
