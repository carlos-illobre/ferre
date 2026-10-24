#!/bin/sh
# Crea una base por servicio, cada una con su usuario, que solo puede conectarse a la suya
# (ADR-026). Corre como el administrador de la instancia, la primera vez que arranca.
set -eu
: "${CLAVE_BASE_MOSTRADOR:?falta CLAVE_BASE_MOSTRADOR}"
: "${CLAVE_BASE_PROCESOS:?falta CLAVE_BASE_PROCESOS}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v clave_mostrador="$CLAVE_BASE_MOSTRADOR" -v clave_procesos="$CLAVE_BASE_PROCESOS" <<'SQL'
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
CREATE ROLE mostrador LOGIN PASSWORD :'clave_mostrador';
CREATE DATABASE mostrador OWNER mostrador;
REVOKE CONNECT ON DATABASE mostrador FROM PUBLIC;
CREATE ROLE procesos LOGIN PASSWORD :'clave_procesos';
CREATE DATABASE procesos OWNER procesos;
REVOKE CONNECT ON DATABASE procesos FROM PUBLIC;
SQL
