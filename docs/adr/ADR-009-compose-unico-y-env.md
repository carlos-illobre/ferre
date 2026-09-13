# ADR-009: Un solo docker-compose.yml con el .env como única fuente de configuración

**Estado:** Aceptado
**Fecha:** 2026-09-13

---

## Contexto

Hay tres ambientes: la laptop de desarrollo, CI y la máquina de Oracle. Lo que cambia
entre ellos es poco: dominio, base de datos, token y etiqueta de imagen.

## Opciones consideradas

### 1. Un compose por ambiente
`docker-compose.prod.yml` y compañía divergen en silencio: un servicio o un healthcheck
agregado en uno solo, y producción y desarrollo dejan de ser el mismo sistema.

### 2. Un compose con valores por omisión en las variables
Cómodo, pero una variable olvidada cae en el default sin aviso; si es una de seguridad,
arranca abierto.

### 3. Un compose, sin defaults, con el .env como única fuente (elegida)

## Decisión

- Un solo `docker-compose.yml`. Lo que solo existe en un ambiente va con `profiles`
  (la base local, perfil `local`).
- Toda variable que cambia entre ambientes se interpola con `${VAR:?mensaje}`: ausente,
  el arranque falla y se ve. Lo que no cambia va literal en el compose.
- Ningún servicio tiene valor por omisión para una variable del `.env`: `config.ts` y
  `config.py` fallan al arrancar si falta.
- `.env.example` y `deployment/oracle-single/.env.oracle` declaran las mismas variables;
  `tests/integration/paridad_env.sh` lo verifica y también que el compose no interpole
  nada que ningún `.env` declare.

## Consecuencias

### Positivas
- La diferencia entre ambientes es exactamente el contenido del `.env`.
- Un error de configuración se ve al arrancar, no en producción a las 3 de la mañana.

### Negativas
- Agregar una variable obliga a tocar tres archivos. La prueba de paridad avisa si se
  olvida uno.

### Lo que no cambia
Nada: es la base del proyecto.

## Cuándo revisar esta decisión

- Si aparece un cuarto ambiente con diferencias estructurales que `profiles` no cubra.

## Referencias

Skill `microservicios-base`, `referencias/invariantes.md`.
