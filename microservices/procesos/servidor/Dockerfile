# Procesos (ADR-019). Contexto de build: la raíz del repo, por el lockfile del workspace.
# Solo entra este paquete; no depende de nada de Ferrebress.
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY microservices/procesos/servidor/package.json microservices/procesos/servidor/
RUN pnpm install --frozen-lockfile --filter procesos-servidor...

FROM deps AS build
COPY microservices/procesos/servidor microservices/procesos/servidor
RUN pnpm --filter procesos-servidor build && pnpm --filter procesos-servidor --prod deploy --legacy /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
RUN addgroup -g 10001 app && adduser -u 10001 -G app -D app
WORKDIR /app
COPY --from=build --chown=app:app /out ./
COPY --from=build --chown=app:app /app/microservices/procesos/servidor/dist ./dist
# Las migraciones van al lado del migrador compilado, donde las busca (src/persistencia/migrar.ts).
COPY --from=build --chown=app:app /app/microservices/procesos/servidor/src/persistencia/migraciones ./dist/persistencia/migraciones
USER app
EXPOSE 8090
CMD ["node", "dist/index.js"]
