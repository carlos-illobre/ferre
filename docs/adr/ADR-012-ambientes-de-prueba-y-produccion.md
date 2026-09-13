# ADR-012: Dos ambientes en la misma máquina, promoción por rama, despliegue desde CI

**Estado:** Aceptado
**Fecha:** 2026-09-13

---

## Contexto

Cuando el sistema esté en uso, cada cambio hay que probarlo antes de que lo vea el
empleado. Hay una sola máquina en Oracle (Ampere, 2 núcleos, 12 GB), un solo sitio de
GitHub Pages por repositorio, y dos proyectos gratuitos en Supabase. El dueño pidió que
un merge a `master` actualice pruebas y lo mismo con producción, con GitHub Actions.

## Opciones consideradas

### 1. Un solo ambiente y probar en local
Barato, pero "en local" no tiene Supabase, ni Pages, ni Google, ni la máquina real. Lo
que rompe en producción es justamente lo que no está en local.

### 2. Cloudflare Pages para el cliente, con un ambiente por rama
Resuelve el cliente con elegancia, pero agrega un proveedor para algo que dos carpetas
en el mismo sitio de Pages resuelven, y no toca el problema real, que es la API y la base.

### 3. Segunda máquina para pruebas
No hay. Y con 12 GB, dos ambientes de esta app entran de sobra.

### 4. Dos proyectos de compose en la misma máquina, dos bases, dos carpetas en Pages, promoción por rama (elegida)

## Decisión

- **Ramas:** `master` es pruebas. `produccion` es producción. Pasar a producción es
  `git push origin master:produccion`; revertir es desplegar el SHA anterior. No son
  ramas de trabajo: son punteros a lo que está vivo en cada ambiente.
- **Máquina:** dos proyectos de compose con el mismo `docker-compose.yml` y un `.env`
  cada uno (`COMPOSE_PROJECT_NAME`, `AMBIENTE`, `COMPOSE_PROFILES`). Volúmenes y red
  propios por proyecto. Un solo Caddy, el de producción, atiende los dos dominios y llega
  a la API de pruebas por una red externa compartida (`ferre-borde`) con alias por
  ambiente. Pruebas no publica puertos.
- **Bases:** un proyecto de Supabase por ambiente.
- **Cliente web:** un sitio de Pages, la rama `produccion` en la raíz y `master` en
  `/pruebas/`. Mismo origen, así que comparten `ORIGEN_WEB` y el cliente de Google.
- **CI despliega:** en cada push a `master` o `produccion`, después de pruebas e imágenes,
  un job entra por SSH a la máquina con una clave guardada como secreto y corre
  `deploy.sh <ambiente> <sha>`. El mismo script sirve desde la computadora de una persona
  para revertir. Los ambientes de GitHub (`pruebas`, `produccion`) permiten exigir
  aprobación manual en producción si se quiere.
- **Imágenes ARM:** el job de imágenes corre en un runner ARM nativo de GitHub, porque la
  máquina es Ampere. Emular arm64 sobre x86 tarda varias veces más.
- Los perfiles del compose se activan desde el `.env` (`COMPOSE_PROFILES`), no con flags:
  así el mismo comando `docker compose up` hace lo correcto en cada ambiente.

## Consecuencias

### Positivas
- Cada cambio se prueba contra Supabase, Pages y Google reales antes de producción.
- Producción solo cambia cuando alguien mueve la rama.
- Revertir es un comando con un SHA.

### Negativas
- Una clave SSH con acceso a la máquina vive en los secretos de GitHub. Se mitiga con
  una clave exclusiva para CI, revocable, y con el ambiente `produccion` protegido.
- Dos ambientes consumen el doble de memoria; con 12 GB sobra, pero pruebas se puede
  apagar cuando no se usa.
- La red externa `ferre-borde` hay que crearla una vez (lo hace `deploy.sh`, y en local
  `tests/e2e.sh`).

### Lo que no cambia
Un solo `docker-compose.yml`; el `.env` sigue siendo la única diferencia entre ambientes.

## Cuándo revisar esta decisión

- Si aparece presupuesto para una segunda máquina: pruebas se muda ahí sin cambiar nada
  más que el destino SSH.
- Si el dominio del cliente deja de ser Pages (dominio propio): `ORIGEN_WEB` pasa a
  diferir entre ambientes.

## Referencias

ADR-002, ADR-006, ADR-007, ADR-010. `deployment/oracle-single/ORACLE.md`. Issue #53.
