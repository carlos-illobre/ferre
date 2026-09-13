# Multi-etapa: dependencias, build, y una imagen final sin toolchain.
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json api/
COPY pwa/package.json pwa/
COPY precios/package.json precios/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build && pnpm --filter api --prod deploy --legacy /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
# uid fijo: los volúmenes guardan el número, y si cambia entre versiones el contenedor
# deja de poder escribir sin explicación.
RUN addgroup -g 10001 app && adduser -u 10001 -G app -D app
WORKDIR /app
COPY --from=build --chown=app:app /out ./
COPY --from=build --chown=app:app /app/api/dist ./dist
COPY --from=build --chown=app:app /app/api/public ./public
COPY --from=build --chown=app:app /app/api/migrations ./migrations
USER app
EXPOSE 8080
CMD ["node", "dist/index.js"]
