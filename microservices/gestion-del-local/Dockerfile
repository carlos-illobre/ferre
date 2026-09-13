# Contexto de build: la raíz del repo, porque el workspace comparte libraries/ (ADR-010).
# Solo entra lo que este servicio necesita; el .dockerignore de la raíz excluye el resto.
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY microservices/gestion-del-local/package.json microservices/gestion-del-local/
COPY libraries/calculo-de-precios/package.json libraries/calculo-de-precios/
RUN pnpm install --frozen-lockfile --filter gestion-del-local...

FROM deps AS build
COPY libraries/calculo-de-precios libraries/calculo-de-precios
COPY microservices/gestion-del-local microservices/gestion-del-local
RUN pnpm --filter gestion-del-local... build && pnpm --filter gestion-del-local --prod deploy --legacy /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
# uid fijo: los volúmenes guardan el número, y si cambia entre versiones el contenedor
# deja de poder escribir sin explicación.
RUN addgroup -g 10001 app && adduser -u 10001 -G app -D app
WORKDIR /app
COPY --from=build --chown=app:app /out ./
COPY --from=build --chown=app:app /app/microservices/gestion-del-local/dist ./dist
COPY --from=build --chown=app:app /app/microservices/gestion-del-local/migrations ./migrations
USER app
EXPOSE 8080
CMD ["node", "dist/index.js"]
