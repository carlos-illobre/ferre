# Contexto de build: la raíz del repo, por el lockfile del workspace (ADR-018).
# Solo entra lo que este servicio necesita; el .dockerignore de la raíz excluye el resto.
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY microservices/comercial/package.json microservices/comercial/
# La conexión entre dispositivos es un paquete del workspace que se compila al instalar (ADR-027).
COPY microservices/conexion microservices/conexion
RUN pnpm install --frozen-lockfile --filter comercial...

FROM deps AS build
COPY microservices/comercial microservices/comercial
RUN pnpm --filter comercial... build && pnpm --filter comercial --prod deploy --legacy /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
# uid fijo: los volúmenes guardan el número, y si cambia entre versiones el contenedor
# deja de poder escribir sin explicación.
RUN addgroup -g 10001 app && adduser -u 10001 -G app -D app
WORKDIR /app
COPY --from=build --chown=app:app /out ./
COPY --from=build --chown=app:app /app/microservices/comercial/dist ./dist
# Las migraciones van al lado del migrador compilado, donde las busca (src/persistencia/migrar.ts).
COPY --from=build --chown=app:app /app/microservices/comercial/src/persistencia/migraciones ./dist/persistencia/migraciones
RUN mkdir -p /app/datos/listas && chown app:app /app/datos/listas
USER app
EXPOSE 8080
CMD ["node", "dist/index.js"]
