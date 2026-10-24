# ADR-025: Sin ORM: la capa de datos usa solo Kysely, con migraciones SQL y tipos generados

**Estado:** Aceptado
**Fecha:** 2026-10-24
**Especificación:** `specs/022-base-de-datos-propia/`

---

## Contexto

Carlos pidió (decisiones 150 y 151) que todo lo que guarda o lee datos esté en una capa propia
de cada servicio, sin código repetido, con el acento en la calidad y la simpleza, y que se
analice si conviene un ORM. En el mostrador convivían dos formas de consultar: Kysely, con tipos
(ADR-018), y SQL a mano con `pg`. Por eso había dos funciones de transacción, dos de registrar un
evento, y la forma de las tablas escrita a mano repitiendo las migraciones. El mostrador y
Procesos tenían cada uno su copia del corredor de migraciones.

## Opciones consideradas

### 1. Prisma
Esquema declarativo y cliente generado. Su lenguaje de esquema y su motor de migraciones
compiten con las migraciones SQL que ya existen; lo que no sabe expresar (`DISTINCT ON`, sumas de
movimientos, triggers y `pg_notify` de ADR-023) vuelve a SQL a mano, y quedan otra vez dos formas.
Es una dependencia grande, con su propio motor.

### 2. Drizzle
Liviano y con el SQL a la vista. El esquema se escribe en TypeScript, que repite lo que dicen las
migraciones o pasa a generarlas él. Reescribir lo que ya está en Kysely sin ganar casi nada.

### 3. TypeORM o MikroORM
Entidades con relaciones, carga perezosa y unidad de trabajo. Decoradores y estado escondido: lo
contrario de simple, para un dominio de documentos y movimientos que solo agregan filas.

### 4. Solo Kysely (elegida)
Ya era la mitad del código. Arma consultas con tipos sin esconder el SQL; lo propio de Postgres
entra con su plantilla `sql`, con parámetros, sin salir de la herramienta. Trae un migrador.

## Decisión

- **Sin ORM.** Toda consulta pasa por la instancia de Kysely de la capa de datos: el constructor
  cuando la consulta es simple, la plantilla `sql` cuando es propia de Postgres. No se usa `pg`
  directo fuera de la conexión.
- **Una sola forma de cada cosa:** una función de transacción, una de anotar un evento, una de
  guardar y leer un archivo.
- **Migraciones:** los mismos archivos `.sql` numerados, aplicados por el `Migrator` de Kysely con
  un proveedor que lee la carpeta (unas diez líneas por servicio). Kysely pone el candado, la
  transacción y el registro. No hay una biblioteca interna compartida entre servicios
  (decisión 151, ADR-018).
- **Tipos generados:** `kysely-codegen` escribe la forma de las tablas leyendo la base migrada. Las
  listas cerradas de valores pasan de `CHECK` a tipos `ENUM` de Postgres, así salen como tipos sin
  escribirlas dos veces. Una prueba falla si el archivo generado no coincide.
- **Pruebas:** la capa de datos se prueba contra PostgreSQL de verdad, con 100 % de cobertura
  (ADR-004, enmienda del 2026-10-24).

## Consecuencias

### Positivas
- Una herramienta y una forma de hacer cada cosa; el SQL se sigue leyendo.
- La forma de las tablas se escribe una sola vez, en la migración.

### Negativas
- Un `ENUM` de Postgres no deja quitar un valor: para eso hace falta un tipo nuevo y una
  migración que lo cambie.
- Generar los tipos pide una base levantada.

### Lo que no cambia
Las migraciones siguen siendo SQL, numeradas, y una aplicada no se edita.

## Cuándo revisar esta decisión

- Si aparece un servicio cuyo modelo sí son objetos con relaciones que se cargan y se modifican.

## Referencias

ADR-018, ADR-023, ADR-026. Decisiones 150 y 151.
