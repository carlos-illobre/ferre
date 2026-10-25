#!/usr/bin/env bash
# La base en la máquina (specs/022, ADR-026), contra el stack levantado: una base y un usuario por
# servicio, cada usuario solo en la suya, publicada solo en la interfaz local, con los datos en un
# volumen que sobrevive al contenedor, y la primera persona dada de alta con el comando de siempre.
# Necesita el stack: con RAPIDO=1 se saltea (código 3).
set -uo pipefail
[[ "${RAPIDO:-0}" == "1" ]] && exit 3
cd "$(dirname "$0")/../.."
valor() { grep "^$1=" .env | cut -d= -f2-; }
admin() { docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -tAc "$1"; }
como() { docker compose exec -T -e PGPASSWORD="$2" db psql -h 127.0.0.1 -U "$1" -d "$3" -v ON_ERROR_STOP=1 -tAc "$4"; }
falla() { echo "$1"; exit 1; }

# 022-E01: las bases del mostrador, de Procesos y de Auditoría, cada una con su usuario y su esquema al día.
[[ "$(admin "SELECT string_agg(datname, ',' ORDER BY datname) FROM pg_database WHERE datname IN ('auditoria', 'mostrador', 'procesos')")" == "auditoria,mostrador,procesos" ]] || falla "faltan las bases auditoria, mostrador y procesos"
[[ "$(como mostrador "$(valor CLAVE_BASE_MOSTRADOR)" mostrador "SELECT count(*) > 30 FROM kysely_migration")" == "t" ]] || falla "el esquema del mostrador no está al día"
[[ "$(como procesos "$(valor CLAVE_BASE_PROCESOS)" procesos "SELECT count(*) FROM procesos.kysely_migration")" -ge 1 ]] || falla "el esquema de Procesos no está al día"

# 022-E04: el usuario de cada servicio no puede abrir la base del otro.
como procesos "$(valor CLAVE_BASE_PROCESOS)" mostrador "SELECT 1" >/dev/null 2>&1 && falla "el usuario de Procesos abrió la base del mostrador"
como mostrador "$(valor CLAVE_BASE_MOSTRADOR)" procesos "SELECT 1" >/dev/null 2>&1 && falla "el usuario del mostrador abrió la base de Procesos"
como auditoria "$(valor CLAVE_BASE_AUDITORIA)" mostrador "SELECT 1" >/dev/null 2>&1 && falla "el usuario de Auditoría abrió la base del mostrador"
como mostrador "$(valor CLAVE_BASE_MOSTRADOR)" auditoria "SELECT 1" >/dev/null 2>&1 && falla "el usuario del mostrador abrió la base de Auditoría"
for base in postgres template1; do
  como mostrador "$(valor CLAVE_BASE_MOSTRADOR)" "$base" "SELECT 1" >/dev/null 2>&1 && falla "el usuario del mostrador abrió la base $base"
  como procesos "$(valor CLAVE_BASE_PROCESOS)" "$base" "SELECT 1" >/dev/null 2>&1 && falla "el usuario de Procesos abrió la base $base"
done

# 027: un servicio nuevo con base aparece solo en un ambiente que ya existe: asegurar.sh crea su
# base y su usuario a partir de su CLAVE_BASE_<SERVICIO>, sin tocar las demás.
docker compose exec -T -e CLAVE_BASE_SERVICIONUEVO=clave-nueva db sh -c 'rm -f /tmp/bases-aseguradas && asegurar.sh' || falla "asegurar.sh falló con un servicio nuevo"
como servicionuevo clave-nueva servicionuevo "SELECT 1" >/dev/null 2>&1 || falla "el servicio nuevo no abre su base"
como servicionuevo clave-nueva mostrador "SELECT 1" >/dev/null 2>&1 && falla "el servicio nuevo abrió la base del mostrador"
docker compose exec -T db psql -U postgres -qc "DROP DATABASE servicionuevo" -c "DROP ROLE servicionuevo" >/dev/null

# 022-E08: las tablas de Procesos están en su base, no en la del mostrador.
[[ "$(como mostrador "$(valor CLAVE_BASE_MOSTRADOR)" mostrador "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'procesos'")" == "0" ]] || falla "la base del mostrador tiene tablas de Procesos"

# 022-E03: la base se publica solo en la interfaz local de la máquina.
[[ "$(docker compose port db 5432)" == 127.0.0.1:* ]] || falla "la base se publica fuera de 127.0.0.1"

# 022-E06: los datos viven en un volumen: recrear el contenedor no los pierde.
como mostrador "$(valor CLAVE_BASE_MOSTRADOR)" mostrador "INSERT INTO configuracion (clave, valor) VALUES ('prueba.volumen', 'sigue') ON CONFLICT (clave) DO UPDATE SET valor = 'sigue'" >/dev/null
docker compose up -d --wait --force-recreate db >/dev/null 2>&1 || falla "la base no volvió a arrancar"
[[ "$(como mostrador "$(valor CLAVE_BASE_MOSTRADOR)" mostrador "SELECT valor FROM configuracion WHERE clave = 'prueba.volumen'")" == "sigue" ]] || falla "recrear el contenedor perdió los datos"
como mostrador "$(valor CLAVE_BASE_MOSTRADOR)" mostrador "DELETE FROM configuracion WHERE clave = 'prueba.volumen'" >/dev/null
docker compose up -d --wait >/dev/null 2>&1

# 022-E09: en una base sin nadie, la primera persona se da de alta con el comando y recibe todos los roles.
correo="primera-$RANDOM@ferre.test"
docker compose exec -T comercial node dist/crear-usuario.js "$correo" "Primera" >/dev/null || falla "el comando no dio de alta a la primera persona"
[[ "$(como mostrador "$(valor CLAVE_BASE_MOSTRADOR)" mostrador "SELECT (SELECT count(*) FROM usuario_rol ur JOIN usuario u ON u.id = ur.usuario_id WHERE u.email = '$correo') = (SELECT count(*) FROM rol)")" == "t" ]] || falla "la primera persona no recibió todos los roles"
como mostrador "$(valor CLAVE_BASE_MOSTRADOR)" mostrador "DELETE FROM auditoria_bandeja WHERE evento->'contenido'->>'email' = '$correo'; DELETE FROM usuario_rol WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '$correo'); DELETE FROM usuario WHERE email = '$correo'" >/dev/null
exit 0
