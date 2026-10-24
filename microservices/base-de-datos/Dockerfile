# La base de datos (ADR-026): una instancia por ambiente, con una base y un usuario por servicio.
# El script de inicio corre una sola vez, cuando el volumen de datos está vacío.
FROM postgres:17-alpine
COPY iniciar.sh /docker-entrypoint-initdb.d/
