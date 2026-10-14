# Feature Specification: Reordenamiento del código

**Feature Branch**: `010-reordenamiento-del-codigo`

**Created**: 2026-10-13

**Status**: Aprobada

**Maquetas**: Aprobadas (las piezas de interfaz unificadas, decisión 85: `maquetas/piezas-unificadas.html`)

**Input**: Carlos aprobó el 2026-10-13 la auditoría de arquitectura (`docs/auditoria-de-arquitectura.md`) y pidió hacer el reordenamiento. Mientras dure no se cambian pantallas.

## Clarifications

### Session 2026-10-13

- Q: ¿El lector de planillas en Python queda como servicio aparte? → A: Sí, por ahora queda aparte.
- Q: Para «precio a mano» y «otro margen», ¿quién calcula? → A: La vista previa la calcula el front y el servidor confirma.
- Q: ¿Se aceptan las librerías propuestas (manejo de datos del servidor, validación con tipos que llegan del servidor, navegación, consultas con tipos)? → A: Sí.
- Q: ¿Se frenan los cambios de pantallas mientras se unifica cada proceso? → A: Sí.
- Q: ¿Un servicio para el celular y otro para la computadora? → A: No: un solo front, con el negocio una sola vez y dos juegos de pantallas.

## User Scenarios & Testing

### User Story 1 - El código queda ordenado sin que cambie nada de lo que hace la aplicación (Priority: P1)

Quien mantiene Ferrebress encuentra todo el código en un solo lugar, separado de la
documentación; la tecnología que sirve para cualquier aplicación, separada del negocio de la
ferretería; y cada regla del negocio escrita una sola vez. Quien usa Ferrebress no nota nada:
todo se ve y funciona igual que antes de cada etapa.

**Why this priority**: Los defectos de los días 12 y 13 de octubre salieron, en su mayoría, de
reglas escritas dos veces y de tecnología mezclada con negocio.

**Independent Test**: Después de cada etapa, las pruebas unitarias y las de punta a punta que
pasaban siguen pasando, y la aplicación se despliega en pruebas.

**Acceptance Scenarios**:

- **E01** **Given** el repositorio, **When** termina la etapa 1, **Then** todo el código de la aplicación está bajo una sola carpeta de servicios (el front, el servidor y el lector de planillas), y la documentación no tiene código mezclado.
- **E02** **Given** cualquier etapa terminada, **When** se corren las pruebas unitarias y las de punta a punta, **Then** pasan todas las que pasaban antes de esa etapa, sin haberles cambiado lo que comprueban.
- **E03** **Given** cualquier etapa terminada, **When** se sube, **Then** se despliega en pruebas con los mismos nombres de servicio y de imagen que antes, sin tocar nada en la máquina.
- **E04** **Given** la etapa 2 terminada, **When** se mira la tecnología reutilizable (teclado, navegación, cámara, guardado local, cola de envíos, canal en tiempo real, piezas de interfaz), **Then** está en archivos que no dependen de nada del negocio, y una verificación automática falla si alguno pasa a depender.
- **E05** **Given** la etapa 3 terminada para un proceso (por ejemplo, vender), **When** se busca dónde está su regla, **Then** está una sola vez y la usan las pantallas del celular y las de la computadora.
- **E06** **Given** la etapa 4 terminada, **When** se pide un producto al servidor, **Then** llega con su precio ya calculado, su explicación y el precio para cada uno de los cinco márgenes; el front no calcula precios, salvo la vista previa de un margen o un precio tipeado, que el servidor confirma al cobrar.
- **E07** **Given** la etapa 4 terminada, **When** se mira el repositorio, **Then** no hay ninguna carpeta de librerías compartidas entre servicios.
- **E08** **Given** una etapa a medio hacer, **When** algo falla, **Then** se puede volver a la versión anterior con el mecanismo de despliegue de siempre: ninguna etapa cambia datos guardados de un modo que no se pueda deshacer.
- **E09** **Given** el reordenamiento en curso, **When** Carlos pide un cambio de pantalla del proceso que se está unificando, **Then** se anota para después y no se hace en el medio.

## Requirements

### Functional Requirements

- **RNF-60**: El código se organiza así, y se mantiene así: todo bajo una carpeta de servicios (front, servidor y lector de planillas); en el front, tres capas: tecnología reutilizable sin dependencias del negocio, negocio escrito una sola vez, y pantallas del celular y de la computadora que solo muestran; en el servidor, tres capas: lo que traduce el pedido, la regla y el acceso a los datos. No hay librerías compartidas entre servicios: lo que el front necesita saber de la forma de los datos lo recibe del servidor. El cálculo de precios vive en el servidor.

### Key Entities

No agrega datos del negocio.

## Success Criteria

- Una regla del negocio se cambia en un solo archivo y vale para el celular y la computadora.
- La tecnología reutilizable se puede copiar a otro proyecto sin llevarse nada de la ferretería.

## Assumptions

- Las etapas y su orden son las de la auditoría: 1 carpetas, 2 tecnología aparte, 3 negocio una sola vez (proceso por proceso), 4 precios en el servidor, 5 servidor en tres capas.
- La carpeta de la librería de precios se queda donde está hasta la etapa 4, que es la que la elimina.
