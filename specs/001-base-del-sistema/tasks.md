# Tasks: Base del sistema

**Input**: Línea de base. Los issues cerrados de base e infraestructura de
`carlos-illobre/ferre`, como tareas ya hechas. Título y estado confirmados con
`gh issue view` el 2026-10-10: los doce están cerrados.

**Prerequisites**: [spec.md](spec.md), [plan.md](plan.md)

## Format: `[ID] Description (#issue)`

## Etapa 0 · Base del proyecto

- [x] T001 Ordenar el repositorio y proteger los datos de proveedores (#1)
- [x] T002 Decidir stack técnico y arquitectura offline-first (ADR-001) (#2)
- [x] T003 Andamiaje del proyecto: arranque con un comando, tests y CI (#3)
- [x] T004 Documentar el procedimiento actual del empleado (venta y compra) (#4)
- [x] T005 Principios de diseño de la interfaz (guía UX) (#5)
- [x] T006 Separar backend y cliente web en dos servicios; publicar el cliente en GitHub Pages (#51)
- [x] T007 Ambientes de prueba y producción en la misma máquina, con despliegue desde CI (#53)

## Infraestructura de otras etapas

Etapa 1 · MVP:

- [x] T008 Funcionamiento sin internet desde el navegador (PWA) y sincronización (#18)
- [x] T009 Todo número calculado muestra de dónde sale (#47)

Etapa 4 · Administración remota:

- [x] T010 Sincronización local ↔ nube tolerante a microcortes (#37)
- [x] T011 Servidor en la nube (Oracle Cloud Always Free) con TLS (#38)
- [x] T012 Acceso desde el celular como app (PWA) (#42)

## Lo que sigue abierto de la base

No son tareas de esta carpeta; están en el backlog.

- #19 Poner la app en la nube y acceder desde laptop y celular sin instalar nada: de ahí
  cuelgan el aviso si la API o la base dejan de responder (RNF-12) y los respaldos (RNF-21,
  RNF-22, RNF-23).
- #21 Prueba piloto de 2 semanas con el empleado: valida RNF-01 y RNF-02.
