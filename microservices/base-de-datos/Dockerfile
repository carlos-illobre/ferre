# La base de datos (ADR-026): una instancia por ambiente, con una base y un usuario por servicio.
# El control de salud corre asegurar.sh: la base de cada servicio y su usuario aparecen solos.
FROM postgres:17-alpine
COPY asegurar.sh /usr/local/bin/asegurar.sh
