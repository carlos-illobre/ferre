# ADR-007: Las imágenes se construyen en CI y se publican en GHCR

**Estado:** Aceptado
**Fecha:** 2026-09-13

---

## Contexto

Hay que decidir dónde se construyen las imágenes Docker que corre la máquina de Oracle.

## Opciones consideradas

### 1. Construir en la propia máquina de Oracle
El script de despliegue clona y construye ahí. Simple, pero consume CPU y memoria de la
única máquina en cada despliegue, y lo que corre en producción depende del estado de esa
máquina y no de un artefacto verificado.

### 2. Construir en GitHub Actions y publicar en GHCR (elegida)
CI construye después de que pasan las pruebas, etiqueta por SHA corto y publica en el
registro de GitHub del mismo repositorio. La máquina solo descarga.

## Decisión

El job `imagenes` del workflow corre solo en `master` después de los E2E, construye con
el mismo `docker-compose.yml` y publica `mostrador` e `importador` etiquetadas con el SHA
corto del commit. El `.env` de producción fija `IMAGEN_TAG` a ese SHA; revertir es cambiar
el SHA y volver a levantar.

## Consecuencias

### Positivas
- Lo que corre en producción es exactamente lo que pasó CI.
- Reversión en segundos, sin reconstruir.

### Negativas
- Las imágenes de un repo público en GHCR son públicas; no contienen secretos (todo sale
  del `.env`), pero el código compilado es visible. El repo ya es público, así que no
  agrega exposición.

### Lo que no cambia
En desarrollo se construye localmente con `docker compose build`, con el mismo compose.

## Cuándo revisar esta decisión

- Si el repo pasa a privado, el registro necesita autenticación en la máquina de Oracle.

## Referencias

ADR-009. Skill `desplegar-en-oracle-cloud`.

---

## Enmienda (ADR-010)

Las imágenes publicadas son `gestion-del-local` y `listas-de-proveedores`. El cliente
web no tiene imagen: se publica en GitHub Pages.

→ [ADR-010](ADR-010-servicios-clientes-y-librerias.md)
