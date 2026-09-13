# Registros de decisiones de arquitectura

Si hubo una alternativa razonable, hay un ADR. Los ADR viejos no se editan: se enmiendan
al final. Formato en la skill `microservicios-base`, `referencias/adr.md`.

| Nº | Título | Estado | Fecha |
|---|---|---|---|
| [001](ADR-001-stack-tecnologico.md) | TypeScript para API y PWA, Python para el importador | Aceptado | 2026-09-13 |
| [002](ADR-002-base-de-datos-respaldo-y-disponibilidad.md) | PostgreSQL administrado en Supabase, máquina de Oracle sin estado, volcado horario y prueba de restauración | Aceptado | 2026-09-13 |
| [003](ADR-003-limites-del-microservicio.md) | Este repo es el microservicio de mostrador; se integra por API y eventos | Aceptado | 2026-09-13 |
| [004](ADR-004-estrategia-de-pruebas.md) | E2E de los caminos principales; sin compuerta de cobertura ni mutation testing | Aceptado | 2026-09-13 |
| [005](ADR-005-indexeddb-directo.md) | IndexedDB directo con un wrapper propio, sin Dexie | Aceptado | 2026-09-13 |
| [006](ADR-006-caddy.md) | Caddy como reverse proxy con TLS automático | Aceptado | 2026-09-13 |
| [007](ADR-007-imagenes-en-ci-y-ghcr.md) | Las imágenes se construyen en CI y se publican en GHCR | Aceptado | 2026-09-13 |
| [008](ADR-008-pnpm-y-uv.md) | pnpm para TypeScript y uv para Python | Aceptado | 2026-09-13 |
| [009](ADR-009-compose-unico-y-env.md) | Un solo docker-compose.yml con el .env como única fuente | Aceptado | 2026-09-13 |
| [010](ADR-010-servicios-clientes-y-librerias.md) | Servicios, clientes y librerías separados; nombres por negocio; cliente web en GitHub Pages | Aceptado | 2026-09-13 |
| [011](ADR-011-autenticacion-sin-contrasenas.md) | Entrar con Google, sesiones opacas revocables, login por QR, auditoría por usuario | Aceptado | 2026-09-13 |
| [012](ADR-012-ambientes-de-prueba-y-produccion.md) | Dos ambientes en la misma máquina, promoción por rama, despliegue desde CI | Aceptado | 2026-09-13 |
| [013](ADR-013-despliegue-por-aviso-y-gateway-compartido.md) | La máquina se despliega sola al recibir un aviso; Caddy compartido como puerta de entrada | Aceptado | 2026-09-13 |
