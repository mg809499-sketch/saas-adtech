# API GrowUp Store (NestJS) — imagen portable: Fly.io, Railway, Koyeb, AWS.
# Usa pnpm deploy (el repo no tiene package-lock.json).
FROM node:22-slim AS build
RUN npm i -g pnpm@12
WORKDIR /src
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
RUN pnpm install --filter api --ignore-scripts
COPY apps/api/prisma apps/api/prisma
RUN pnpm --filter api exec prisma generate
COPY apps/api/tsconfig.json apps/api/
COPY apps/api/src apps/api/src
RUN pnpm --filter api exec tsc -p tsconfig.json
RUN pnpm --filter api deploy /app --ignore-scripts

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app ./
COPY apps/api/prisma ./prisma
RUN npx -y prisma@5.22.0 generate --schema ./prisma/schema.prisma
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
