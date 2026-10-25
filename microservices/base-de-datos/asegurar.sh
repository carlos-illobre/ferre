#!/bin/sh
# Que estén la base y el usuario de cada servicio (ADR-026; specs/027): por cada variable
# CLAVE_BASE_<SERVICIO> del entorno (salvo la del administrador) asegura un usuario <servicio>
# con esa clave y una base <servicio> suya, a la que solo él se conecta. No toca lo que ya está:
# un servicio nuevo con base aparece solo, también en un ambiente que ya existe. Cambiar después
# una clave en el .env no cambia la del usuario (ver DEPLOYMENT.md, «Si se pierde el .env»).
#
# Corre en el control de salud del contenedor: la base no figura sana hasta que todo está. Una
# vez que salió bien no vuelve a hacer nada hasta que el contenedor se recrea (por ejemplo,
# porque cambió el entorno al sumar un servicio).
set -eu
HECHO=/tmp/bases-aseguradas
[ -f "$HECHO" ] && exit 0
pg_isready -q -U postgres -d postgres

consulta() { psql -v ON_ERROR_STOP=1 -X -q -U postgres -d postgres "$@"; }

for variable in $(env | sed -n 's/^\(CLAVE_BASE_[A-Z_]*\)=.*/\1/p'); do
  [ "$variable" = CLAVE_BASE_ADMIN ] && continue
  servicio=$(echo "${variable#CLAVE_BASE_}" | tr 'A-Z' 'a-z')
  clave=$(printenv "$variable")
  consulta -v servicio="$servicio" -v clave="$clave" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'servicio', :'clave')
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'servicio') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'servicio', :'servicio')
 WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'servicio') \gexec
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', :'servicio') \gexec
SQL
done
# Nadie más que el administrador abre las bases del sistema.
consulta -c "REVOKE CONNECT ON DATABASE postgres FROM PUBLIC" -c "REVOKE CONNECT ON DATABASE template1 FROM PUBLIC"
touch "$HECHO"
