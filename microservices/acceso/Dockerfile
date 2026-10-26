# Contexto de build: la raíz del repo, por el lockfile del workspace (ADR-018).
# Solo entra lo que este servicio necesita; el .dockerignore de la raíz excluye el resto.
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY microservices/acceso/package.json microservices/acceso/
# La conexión entre dispositivos es un paquete del workspace que se compila al instalar (ADR-027).
COPY microservices/conexion microservices/conexion
# El kit de auditoría es un paquete del workspace que se compila al instalar (specs/027).
COPY microservices/auditoria-kit microservices/auditoria-kit
RUN pnpm install --frozen-lockfile --filter acceso...

FROM deps AS build
COPY microservices/acceso microservices/acceso
RUN pnpm --filter acceso... build && pnpm --filter acceso --prod deploy --legacy /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
# uid fijo: los volúmenes guardan el número, y si cambia entre versiones el contenedor
# deja de poder escribir sin explicación.
RUN addgroup -g 10001 app && adduser -u 10001 -G app -D app
WORKDIR /app
COPY --from=build --chown=app:app /out ./
COPY --from=build --chown=app:app /app/microservices/acceso/dist ./dist
# Las migraciones van al lado del migrador compilado, donde las busca (src/persistencia/migrar.ts).
COPY --from=build --chown=app:app /app/microservices/acceso/src/persistencia/migraciones ./dist/persistencia/migraciones
USER app
EXPOSE 8097
CMD ["node", "dist/index.js"]
