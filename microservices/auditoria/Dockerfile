# Auditoría (specs/027). Contexto de build: la raíz del repo, por el lockfile del workspace.
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY microservices/auditoria/package.json microservices/auditoria/
# El kit es un paquete del workspace que se compila al instalar: trae el contrato v1.
COPY microservices/auditoria-kit microservices/auditoria-kit
RUN pnpm install --frozen-lockfile --filter auditoria...

FROM deps AS build
COPY microservices/auditoria microservices/auditoria
RUN pnpm --filter auditoria build && pnpm --filter auditoria --prod deploy --legacy /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
RUN addgroup -g 10001 app && adduser -u 10001 -G app -D app
WORKDIR /app
COPY --from=build --chown=app:app /out ./
COPY --from=build --chown=app:app /app/microservices/auditoria/dist ./dist
# Las migraciones van al lado del migrador compilado, donde las busca (src/persistencia/migrar.ts).
COPY --from=build --chown=app:app /app/microservices/auditoria/src/persistencia/migraciones ./dist/persistencia/migraciones
USER app
EXPOSE 8095
CMD ["node", "dist/index.js"]
