# Tasks: Descarga eficiente

Funcionalidad nueva, sin pantallas nuevas: que la aplicación pida a la base solo lo que
necesita, de a páginas, y que no genere registros que nadie usa (aviso de Supabase del
2026-10-18). Carlos aprobó la especificación el 2026-10-20. Plan y ADR-023.

## Tareas

- [x] T001 Especificación, para que Carlos la apruebe
- [x] T002 La salud del servidor no consulta la base y el pool conserva las conexiones (RF-125; E20, E21, E22)
- [x] T003 La base anota qué productos cambiaron y avisa: revisiones, tabla de cambios, triggers y avisos (RF-124) (depende de T002)
- [x] T004 La copia del servidor: carga de a páginas, puesta al día con los avisos y al reconectar, guardado en el disco (RF-124; E14 a E19) (depende de T003)
- [ ] T005 Buscar, código, identificadores, marcas, filtros y páginas desde la copia, con el stock de la página leído de la base (RF-122; E01 a E06, E14) (depende de T004)
- [ ] T006 El cliente busca siempre en el servidor, de a páginas; Catálogo y Productos cargan más al llegar al final; sin conexión no busca (RF-122, RF-123; E01 a E13) (depende de T005)
- [ ] T007 Configuración sin «Trabajar sin conexión» ni «Cómo buscar productos»; el dispositivo borra catálogo, stock y clientes guardados (RF-123; E23, E24) (depende de T006)
- [ ] T008 Documentación: constitución (principio IV), RNF-10, RNF-11, 009 (RF-84, RF-85), ADR-005, estado y decisión 129 (depende de T007)
- [ ] T009 Pruebas de punta a punta de los caminos principales con el catálogo en el servidor, y medida del consumo (SC-001, SC-002) (depende de T008)
- [ ] T010 Revisión independiente (depende de T009)
