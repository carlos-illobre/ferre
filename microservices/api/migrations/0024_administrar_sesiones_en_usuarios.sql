-- «Administrar sesiones» se une a «Administrar usuarios» (decisión 100, specs/007): cerrar sesiones,
-- quitar celulares de otros y fijar los días del vínculo pasan a pedir «Administrar usuarios». Un
-- rol que tenía el permiso viejo sin el nuevo lo pierde: nadie gana permisos que no tenía.
DELETE FROM rol_permiso WHERE permiso = 'admin.sesiones';
