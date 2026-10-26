# Tickets (specs/028). Contexto de build: la raíz del repo, por el lockfile del workspace.
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY microservices/tickets/package.json microservices/tickets/
# El kit es un paquete del workspace que se compila al instalar: trae el contrato v1.
COPY microservices/auditoria-kit microservices/auditoria-kit
RUN pnpm install --frozen-lockfile --filter tickets...

FROM deps AS build
COPY microservices/tickets microservices/tickets
RUN pnpm --filter tickets build && pnpm --filter tickets --prod deploy --legacy /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
RUN addgroup -g 10001 app && adduser -u 10001 -G app -D app
WORKDIR /app
COPY --from=build --chown=app:app /out ./
COPY --from=build --chown=app:app /app/microservices/tickets/dist ./dist
# Las migraciones van al lado del migrador compilado, donde las busca (src/persistencia/migrar.ts).
COPY --from=build --chown=app:app /app/microservices/tickets/src/persistencia/migraciones ./dist/persistencia/migraciones
RUN mkdir -p /app/datos/fotos && chown app:app /app/datos/fotos
USER app
EXPOSE 8096
CMD ["node", "dist/index.js"]
