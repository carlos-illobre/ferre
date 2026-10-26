# ADR-026: La base corre en la máquina, una instancia por ambiente y una base por servicio

**Estado:** Aceptado
**Fecha:** 2026-10-24
**Reemplaza:** la parte de ADR-002 que pone la base en Supabase y deja la máquina sin datos
**Especificación:** `specs/022-base-de-datos-propia/`

---

## Contexto

Supabase avisó el 18/10 que la organización pasó el tope de su plan gratuito (ADR-023). Ese plan
no trae copias, pausa la base sin uso y tiene un tope de 500 MB. Carlos decidió rediseñar el
almacenamiento por etapas (decisión 150): primero, lo más simple; las copias, la réplica y el
resto llegan después. El proyecto pasa a pensarse en microservicios, cada uno dueño de su base.

## Opciones consideradas

### 1. Seguir en Supabase
Pasado el tope, puede restringir la base. No aporta copias ni nada que no dé la máquina.

### 2. Una instancia de Postgres por servicio
Aislamiento total, pero cada instancia ocupa su memoria, y las copias, la réplica y la prueba de
restauración de las etapas siguientes se harían una vez por servicio.

### 3. Una instancia por ambiente y una base por servicio, en la máquina (elegida)
El motor impide que un servicio lea la base de otro (una consulta no cruza bases) y cada base se
copia o se lleva a otra máquina sola. Las copias y la réplica cubren la instancia entera.

### 4. Un esquema por servicio en una sola base
Más barato, pero una consulta puede cruzar esquemas y el aislamiento depende de los permisos.

## Decisión

- La base es una pieza más, en su carpeta de `microservices/`: una imagen propia sobre
  `postgres:17-alpine` con un script de arranque que crea una base y un usuario por servicio,
  cada usuario con permiso de conectarse solo a la suya. Se publica como las demás imágenes.
- Una instancia por ambiente (pruebas y producción son dos proyectos de compose), con los datos
  en un volumen y publicada solo en la interfaz local de la máquina.
- Bases de hoy: `mostrador` y `procesos`. Las de Tickets, las listas y acceso nacen cuando se
  separen esos servicios.
- Las claves van en el `.env` de cada ambiente, una vez cada una; el compose arma la cadena de
  conexión de cada servicio.
- Las bases arrancan vacías: lo que había en Supabase eran datos de prueba (decisión 151).

## Consecuencias

### Positivas
- Sin topes ni pausas de un plan gratuito; las consultas no salen de la máquina.
- Cada servicio solo ve su base.

### Negativas
- La máquina vuelve a guardar datos: hasta la etapa 2 no hay copias, y perder el disco pierde la
  base. Aceptado porque no hay datos reales.
- Dos instancias de Postgres en la misma máquina, una por ambiente.

### Lo que no cambia
El mostrador sigue vendiendo sin conexión con el servidor caído.

## Cuándo revisar esta decisión

- En la etapa 6 (réplica en otra máquina), o si la memoria de la máquina no alcanza para las dos
  instancias.

## Referencias

ADR-002, ADR-013, ADR-019, ADR-023, ADR-025. Decisiones 150 y 151.

---

## Enmienda (specs/027 y 028)

Las bases ya no son solo `mostrador` y `procesos`: se suman `auditoria` (027) y `tickets` (028).
Cada base y su usuario aparecen solos al agregar su `CLAVE_BASE_<SERVICIO>` al `.env`
(`microservices/base-de-datos/asegurar.sh`), también en un ambiente que ya existe.
