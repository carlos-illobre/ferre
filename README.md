# ferre

Sistema de gestión para una ferretería de barrio: un local, un empleado, ~50 proveedores
que mandan listas de precios en Excel, ventas que hoy se anotan en un cuaderno.

Objetivos, en orden:

1. Reemplazar el cuaderno de ventas sin retrasar al empleado.
2. Mantener los precios actualizados sin cargarlos a mano.
3. Saber cuánto stock hay y cuánto vale.
4. Que el dueño administre el negocio a distancia.

## Levantarlo

Requisitos: Docker con Compose. Para desarrollar además Node 22 con pnpm y uv.

```bash
cp .env.example .env
docker compose --profile local up -d --build --wait
```

Abrir http://localhost. El perfil `local` levanta un PostgreSQL propio; en producción la
base es Supabase.

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
- Las decisiones técnicas están en [docs/adr](docs/adr/README.md). Arquitectura en
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), despliegue en
  [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), pruebas en [docs/TESTING.md](docs/TESTING.md).
- La carpeta `privado/` contiene listas de precios reales y otros datos de terceros.
  Está ignorada por git y **no debe subirse nunca**.

## Estructura

```
microservices/mostrador    API Hono + PWA React + paquete precios (pnpm workspace)
microservices/importador   FastAPI: lectura de listas de proveedores (uv)
infrastructure/            Caddy
deployment/oracle-single/  Plantilla de configuración y despliegue en Oracle Cloud
tests/                     Corredores E2E, unitarias e integración
docs/                      Arquitectura, ADR, despliegue, seguridad, pruebas
```
