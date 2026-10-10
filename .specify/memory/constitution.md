# Constitución de ferre (Ferrebress)

Lo que no se negocia. Toda especificación, plan y tarea se revisa contra este documento; si
algo lo contradice, se cambia ese algo o se enmienda la constitución con la aprobación de
Carlos. El porqué de cada regla técnica está en los ADR ([docs/adr](../../docs/adr/README.md)).

## Core Principles

### I. La especificación manda

No se escribe código de una funcionalidad sin su `spec.md` aprobada por Carlos. Si el
trabajo no coincide con la especificación, se corrige el trabajo o se le pregunta a Carlos
si cambia la especificación; el agente no decide el alcance. Los arreglos que no cambian lo
que el usuario ve o puede hacer no necesitan especificación.

### II. La vara es el cuaderno y la calculadora

Una pantalla más lenta que anotar en el cuaderno está mal, aunque sea más completa.

- El orden de la pantalla es el orden del mostrador: buscar, precio, cantidad, cobro.
- Nada obligatorio que el cuaderno no tenga: fecha, producto, cantidad, precio.
- Se aprende sin manual: cada pantalla se explica sola y su estado vacío dice qué hacer.
- En la computadora todo se opera con teclado; el mouse nunca es la única forma.
- Sin ventanas de confirmación, salvo para lo que no se puede recuperar.
- Los errores van en el lugar, en castellano, y dicen qué hacer.
- Buscar y cambiar un margen responden en menos de 100 ms; lo que tarda muestra su avance.

El detalle visual (colores, tipografía, componentes) está en
[docs/sistema-visual.md](../../docs/sistema-visual.md).

### III. Dos interfaces, una app (ADR-014)

Celular y computadora son interfaces distintas sobre la misma API, con la misma paleta y
la misma marca, y no comparten estilos. Toda funcionalidad con pantalla se hace en las dos,
con su prueba en cada una. Un cambio en una no puede alterar la otra: se verifica con
capturas de las dos, antes y después.

### IV. Sin internet no se nota y no se pierde nada

Buscar y vender funcionan igual sin conexión. Todo cambio del mostrador vive en el
dispositivo hasta que el servidor lo confirma. Una caída del servidor no frena el mostrador
(ADR-001, ADR-002, ADR-005).

### V. Nada se borra y todo número se explica

Los históricos de precios, stock y eventos solo reciben filas nuevas; lo que deja de valer
se marca, no se elimina. Todo número calculado se puede tocar y dice de dónde sale, con los
números de origen. Cada acción queda con el usuario que la hizo.

### VI. Primero la prueba, y «hecho» solo con evidencia

Cada escenario de aceptación de una especificación tiene una prueba que se escribe antes
del código y falla hasta que el código existe. Un requerimiento figura como hecho solo
cuando todos sus escenarios tienen una prueba que pasa; lo que solo se puede comprobar en
el mostrador figura «a validar» hasta que Carlos o el Vendedor lo confirman. Las unitarias
corren en cada push; las de punta a punta cubren los caminos principales, una vez por
interfaz. Sin meta de cobertura ni mutation testing (ADR-004).

### VII. Seguro por defecto

El repositorio es público: ni datos de proveedores ni secretos entran en él; lo sensible
vive en `privado/`, que no se sube. La configuración sale del `.env` y sin valores por
omisión. Solo entran usuarios autorizados, sin contraseñas (ADR-011); las sesiones se
pueden cerrar a distancia. Siempre HTTPS. En el servidor la app corre sin privilegios y no
publica puertos a internet (ADR-013). Toda funcionalidad pasa una revisión de seguridad
antes de cerrarse.

### VIII. Disponibilidad antes que escala, y costo cero

Son tres usuarios y unas 200 ventas por día: importa que esté disponible, no que escale.
La infraestructura no cuesta nada hasta que el sistema muestre resultados (ADR-002). No se
construye nada «para después».

### IX. En castellano y con las palabras del mostrador

Código, comentarios, commits, documentación y textos de la app van en español. Se dice
«cuenta corriente» y no «fiado», «lista» y no «importación», «costo» y no «precio de compra
neto». En pantallas, historias y diagramas se nombra el rol (Administrador, Vendedor,
Comprador), no la persona.

### X. Toda decisión queda escrita

Una decisión técnica que afecta a más de una funcionalidad es un ADR, con las opciones
consideradas y el porqué. Un ADR viejo no se reescribe: se le agrega una enmienda. Las
decisiones de negocio de Carlos se anotan con su fecha en la especificación que tocan.

## Restricciones técnicas

- **Stack:** el de ADR-001 y ADR-010. Cada problema con la tecnología que mejor lo resuelve;
  ante la duda, TypeScript.
- **Datos:** `gestion-del-local` es el único dueño de la base (ADR-003). El esquema cambia
  con una migración nueva; nunca se edita una aplicada.
- **Ambientes:** `master` es pruebas y cada push lo despliega; `produccion` se promueve solo
  cuando Carlos lo pide (ADR-012).
- **Equipo del local:** una notebook vieja con internet intermitente y un celular Android.
  El único lector de códigos es la cámara del celular.

## Flujo de trabajo

Una funcionalidad, una carpeta en `specs/` y una rama con el mismo nombre.

| Paso | Rol | Cómo | Produce | Aprueba Carlos |
|---|---|---|---|---|
| 1 | Analista de negocio | `/speckit-specify` y `/speckit-clarify` | `spec.md` | Sí |
| 2 | Diseñador UI/UX | `/ux` | `ux.md` | Sí, si hay pantallas |
| 3 | Arquitecto | `/speckit-plan` | `plan.md`, `data-model.md`, `contracts/` | No |
| 4 | Planificador | `/speckit-tasks` y `/speckit-analyze` | `tasks.md` | No |
| 5 | QA | subagente `qa` | Una prueba que falla por escenario | No |
| 6 | Desarrollador | `/speckit-implement` | Código | No |
| 7 | Seguridad | subagente `seguridad` | Su sección de `verificacion.md` | No |
| 8 | Revisión de UI/UX | subagente `revision-ux` | Capturas contra `ux.md` | No |
| 9 | Verificador | subagente `verificador` | Veredicto en `verificacion.md` | Sí |
| 10 | Cierre | `/cerrar` | Capacidad e índice al día, ADR, rama unida, issue cerrado | |

## Convenciones propias sobre Spec Kit

- **Plantillas sin tocar.** Los títulos de las plantillas quedan como los trae el kit, en
  inglés, para no apartarse del estándar; el contenido se escribe en castellano.
- **Identificadores.** Los requerimientos conservan sus IDs (`RF-19`, `RNF-21`) en lugar de
  `FR-001`. Los nuevos siguen la numeración de su capacidad.
- **Línea de base.** Las carpetas `001` a `007` describen lo construido antes de adoptar el
  método, una por capacidad. Son la especificación vigente de cada capacidad.
- **Qué vale hoy.** Al cerrar una funcionalidad, lo que cambia de una capacidad se
  incorpora a la `spec.md` de esa capacidad, con una nota de qué carpeta lo cambió y cuándo.
  La carpeta de la funcionalidad conserva la historia; la de la capacidad, lo vigente.
- **Dos documentos más por funcionalidad:** `ux.md` y `verificacion.md`.
- **Cada escenario nombra su prueba** (`Prueba: ruta del archivo`). `tests/trazabilidad`
  lo controla en el CI.
- **Índice.** [specs/README.md](../../specs/README.md) lista cada requerimiento con su
  estado y su carpeta. Es la entrada para quien llega al proyecto y lo que lee el tablero.
- **Fuera de Spec Kit:** los ADR (`docs/adr/`), los manuales de operación
  (`docs/operacion/`) y la gestión del portafolio (`proyecto/`).

## Governance

Esta constitución prevalece sobre cualquier otra práctica del repositorio. Se enmienda con
la aprobación de Carlos, anotando qué cambió y por qué, y subiendo la versión. El
verificador comprueba cada funcionalidad contra ella antes de dar su veredicto; lo que la
incumple no se cierra.

**Version**: 1.0.0 | **Ratified**: 2026-10-10 | **Last Amended**: 2026-10-10
