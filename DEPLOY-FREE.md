# Despliegue $0 — vitrinas por subdominio (Upstash + Vercel + Supabase + Cloudflare)

La misma app Next.js sirve consola (dominio principal) y vitrinas
(`<slug>.growupstore.app` o dominio propio) por `middleware.ts` host-first.
Sin repo separado y sin reescribir el API.

## 0. Precios y límites free a vigilar

- **Supabase**: 500 MB, conexiones (usar pooler + caché). **Upstash**: ~10k cmds/día
  (TTLs: slugs 1h, dominios 10min + invalidación al publicar).
- **Vercel hobby**: 100 GB-h + builds. **Render/Railway free**: duerme
  (warm-up con cron cada ~10 min a `/api/v1/billing/plans`).

## 1. Supabase (BD central, única)

1. Crear proyecto → copiar **pooler URL** (puerto 6543) y **service-role key**.
2. `DATABASE_URL=<pooler growup_app>` + `SYSTEM_DATABASE_URL=<pooler superuser>`
   y `npx prisma migrate deploy` desde `apps/api` (incluye RLS `tenant_isolation`).
3. Migrar datos: por cada tienda `GET /stores/:id/export` (origen) →
   `POST /admin/tenants/import` (destino). Luego `prisma db seed` para planes.
4. Verificar: `npx jest` en `apps/api` contra Supabase (13/13, incl. aislamiento).

## 2. Upstash (mapa slug/dominio + throttle)

1. Crear DB Redis → `UPSTASH_REDIS_REST_URL/TOKEN` (web, edge) y endpoint TCP
   como `REDIS_URL` del API (`ioredis` no cambia).
2. El middleware llena `gs:slug:<slug>` (TTL 1h) y `gs:domain:<host>` (TTL 10min)
   solo; sin Upstash resuelve directo al API (funcional, más lento).

## 3. Vercel (web, mismo repo)

1. Importar repo → root `apps/web` → envs: `SITE_DOMAIN=growupstore.app`,
   `NEXT_PUBLIC_API_URL=https://<api>/api/v1`, Upstash, Supabase anon.
2. Dominios: apex + `*.growupstore.app`. Probar:
   `mitienda.growupstore.app` → rewrite a `/s/mitienda` (misma app);
   `/consola` en subdominio → redirect al principal.

## 4. API NestJS (sin reescribir)

Render/Railway free con `DATABASE_URL/SYSTEM_DATABASE_URL` al pooler,
`REDIS_URL` TCP de Upstash y mismos secretos. Warm cron externo cada 10 min.
Checkout, webhooks Bold HMAC y cron de reservas quedan donde están.

## 5. Cloudflare (DNS + TLS)

NS a Cloudflare → `A @` al apex de Vercel + `CNAME *.growupstore.app`.
TLS automático (jubila `Caddyfile.example`). TXT por tienda intacto
(`domainToken`); al verificar, el middleware cachea el dominio.

## 6. Verificación E2E

Vitrina por subdominio y por dominio propio, checkout + mock/webhook,
consola solo en principal (`/consola` en tienda redirige), slug inexistente
→ `/tiendas`, plan inactivo → 404 de vitrina (`by-slug` lo exige).

## Local

`localhost`/`127.0.0.1` y previews `*.vercel.app` siempre van al principal.
Para probar un subdominio sin DNS, fuerza el header Host (el middleware lo
lee tal cual):

```powershell
curl -H "Host: mitiendadeportiva.growupstore.app" http://localhost:3001/ -v
# < HTTP/1.1 200 (rewrite interno a /s/mitiendadeportiva)
curl -H "Host: noexiste.growupstore.app" http://localhost:3001/ -v
# < HTTP/1.1 307 -> principal /tiendas
```
