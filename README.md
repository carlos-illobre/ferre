# ferre

Sistema de gestión para una ferretería de barrio: un local, un empleado, ~50 proveedores
que mandan listas de precios en Excel, ventas que hoy se anotan en un cuaderno.

Objetivos, en orden:

1. Reemplazar el cuaderno de ventas sin retrasar al empleado.
2. Mantener los precios actualizados sin cargarlos a mano.
3. Saber cuánto stock hay y cuánto vale.
4. Que el dueño administre el negocio a distancia.

## Levantarlo

Requisitos: Docker con Compose, Node 22 con pnpm 10, y uv.

```bash
cp .env.example .env
pnpm install
docker compose up -d --build --wait
```

Eso levanta la API en http://localhost (vía Caddy) y un PostgreSQL local. El cliente web
se sirve aparte, como en producción:

```bash
VITE_API_URL=http://localhost pnpm --filter gestion-del-local-web dev
```

En producción la base es Supabase y el cliente está en GitHub Pages.

## Pruebas

```bash
tests/utest.sh            # unitarias, sin nada levantado
tests/itest.sh --rapido   # paridad de configuración
tests/e2e.sh              # caminos principales, levanta el stack
```

## Cómo se organiza el trabajo

- El backlog vive en [GitHub Issues](https://github.com/carlos-illobre/ferre/issues),
  agrupado por etapa en [milestones](https://github.com/carlos-illobre/ferre/milestones).
- Antes de codear un issue se propone la solución y se espera la aprobación del dueño.
- `master` es el ambiente de pruebas y `produccion` el de producción; en cada push la
  máquina se despliega sola (ADR-012, ADR-013). Pasar a producción:
  `git push origin master:produccion`.
- Las decisiones técnicas están en [docs/adr](docs/adr/README.md). Arquitectura en
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), despliegue en
  [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), pruebas en [docs/TESTING.md](docs/TESTING.md),
  configuración de Google para el login en [docs/google-cloud.md](docs/google-cloud.md).
- La carpeta `privado/` contiene listas de precios reales y otros datos de terceros.
  Está ignorada por git y **no debe subirse nunca**.

## Estructura

Los nombres dicen qué parte del negocio resuelve cada pieza (ADR-010).

```
microservices/gestion-del-local        Lo que pasa dentro del local: catálogo, precios, ventas, cuenta corriente, compras, stock (Hono, TypeScript)
microservices/listas-de-proveedores    Recibe listas de proveedores y las convierte en precios (FastAPI, Python)
clientes/gestion-del-local-web         Pantalla del empleado y del dueño (React, PWA, GitHub Pages)
libraries/calculo-de-precios           Costo, margen y precio con su explicación (compartida)
infrastructure/                        Caddy
deployment/oracle-single/              Plantilla de configuración y despliegue en Oracle Cloud
tests/                                 Corredores E2E, unitarias e integración
docs/                                  Arquitectura, modelo, ADR, despliegue, seguridad, pruebas
```
