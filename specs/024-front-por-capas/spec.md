# Feature Specification: El front, por capas y en piezas chicas

**Feature Branch**: `024-front-por-capas`

**Created**: 2026-10-24

**Status**: Aprobada

**Maquetas**: No lleva pantallas

**Input**: Carlos, 2026-10-24: el código del front está desorganizado. Lo quiere todo dividido por
capas (lo gráfico por un lado, lo guardado en el dispositivo en su carpeta, las conexiones en la
suya, el teclado separado de lo gráfico, las pantallas del celular y las de la computadora cada
una en su carpeta), sin código repetido, sin componentes grandes, todo reutilizable, con poca
complejidad, cada pieza con una sola responsabilidad y el menor acoplamiento posible. Aprobó la
propuesta y sus límites; los estilos, «lo estándar, lo que se usa profesionalmente» (decisión 155).

## Clarifications

### Session 2026-10-24 (decisión 155)

- Q: ¿Los límites (como mucho 8 caminos por función, unas 150 líneas por archivo y 40 por componente, y nada de código copiado)? → A: Sí, están bien.
- Q: ¿Los estilos, por componente o en hojas sueltas? → A: Lo estándar, lo que se usa profesionalmente.
- Q: ¿Siguen siendo dos juegos de pantallas, celular y computadora (decisión 46)? → A: Sí: cada uno en su carpeta; lo de debajo de la pantalla es uno solo.

## User Scenarios & Testing

### Historia 1 - El código del front queda ordenado sin que cambie nada de lo que hace la aplicación (Priority: P1)

Quien mantiene Ferrebress encuentra cada cosa en su capa: lo que sirve para cualquier
aplicación, las piezas visuales, las reglas del negocio y las pantallas de cada interfaz, cada
una en su lugar y sin repetir nada. Quien usa Ferrebress no nota nada: todo se ve y funciona
igual que antes de cada etapa.

**Why this priority**: Casi todos los defectos de la revisión de specs/021 salieron de cosas
escritas dos veces (una por interfaz) o de reglas metidas en las pantallas.

**Independent Test**: después de cada etapa pasan las pruebas unitarias y las de punta a punta, y
las mediciones del front no empeoran.

**Acceptance Scenarios**:

1. **E01** **Given** el front ordenado, **When** se busca dónde vive algo (lo guardado en el dispositivo, la conexión con el servidor o con el otro dispositivo, el teclado, una pieza visual, una regla, una pantalla), **Then** está en una sola carpeta, la de su capa.
2. **E02** **Given** cualquier capa, **When** se revisa de qué depende, **Then** solo usa las capas de abajo, por su puerta de entrada, y nunca hay un ciclo; las pantallas del celular y las de la computadora no se usan entre sí.
3. **E03** **Given** el front ordenado, **When** se mide, **Then** ninguna función tiene más de 8 caminos, ningún archivo pasa de unas 150 líneas ni ningún componente de 40, y no hay código copiado.
4. **E04** **Given** una pieza que el celular y la computadora dibujan igual, o una regla, **When** se busca, **Then** está escrita una sola vez.
5. **E05** **Given** cada etapa terminada, **When** se usa la aplicación, **Then** se ve y hace lo mismo que antes, con las mismas teclas.

### Edge Cases

- Una parte que otra funcionalidad está cambiando al mismo tiempo (lo guardado en el dispositivo, specs/022; la conexión entre dispositivos, specs/023): se ordena después de que esa termine, o esa funcionalidad la deja ya en su capa.
- Las teclas se rehacen en T147: la capa del teclado se arma con esa tarea, no dos veces.

## Requirements

- **RNF-69**: el front está en capas (técnica, piezas visuales, negocio y las pantallas de cada interfaz), sin código repetido, en piezas chicas y con poca complejidad (E01 a E05).
- Ninguna regla de negocio ni ninguna pantalla cambia.
- Las reglas de dependencia y los límites los controla una verificación automática en cada subida.

## Success Criteria

- **SC-01**: Al terminar, la verificación automática de capas, complejidad, tamaño y duplicación pasa con los límites de E03, y todas las pruebas pasan.
