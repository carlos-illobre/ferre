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
tests/e2e.sh              # caminos principales, levanta el stack (a mano; en CI corren las unitarias)
```

## Cómo se organiza el trabajo

Con spec driven development sobre [GitHub Spec Kit](https://github.com/github/spec-kit): no
se escribe código de una funcionalidad sin su especificación aprobada.

- **Qué hace el sistema, qué está hecho y qué falta:** [specs/README.md](specs/README.md).
- **Las reglas y el flujo de trabajo:** [la constitución](.specify/memory/constitution.md).
- **Lo que falta hacer** son los [issues](https://github.com/carlos-illobre/ferre/issues),
  agrupados por etapa en [milestones](https://github.com/carlos-illobre/ferre/milestones).
- **Las decisiones técnicas** están en [docs/adr](docs/adr/README.md) y las de negocio en
  [docs/decisiones-de-negocio.md](docs/decisiones-de-negocio.md).
- `master` es el ambiente de pruebas y `produccion` el de producción; en cada push la
  máquina se despliega sola (ADR-012, ADR-013). Pasar a producción:
  `git push origin master:produccion`.
- Arquitectura en [specs/001-base-del-sistema/plan.md](specs/001-base-del-sistema/plan.md),
  cómo se prueba en [specs/001-base-del-sistema/quickstart.md](specs/001-base-del-sistema/quickstart.md),
  despliegue en [docs/operacion/DEPLOYMENT.md](docs/operacion/DEPLOYMENT.md) y configuración
  de Google para el login en [docs/operacion/google-cloud.md](docs/operacion/google-cloud.md).
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
specs/                                 Especificaciones: lo construido (001 a 007) y cada funcionalidad nueva
.specify/                              Spec Kit: constitución, plantillas y scripts
docs/                                  ADR, decisiones de negocio, sistema visual y manuales de operación
```
