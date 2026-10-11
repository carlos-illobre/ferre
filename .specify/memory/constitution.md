# Constitución de ferre (Ferrebress)

Lo que no se negocia. Toda especificación, plan y tarea se revisa contra este documento; si
algo lo contradice, se cambia ese algo o se enmienda la constitución con la aprobación de
Carlos. El porqué de cada regla técnica está en los ADR ([docs/adr](../../docs/adr/README.md)).

## Core Principles

### I. La especificación manda y no depende del código

Lo fijo son las reglas de negocio; el código puede rehacerse en cualquier momento. Las
especificaciones tienen que alcanzar para que alguien que nunca vio este código construya
de nuevo una aplicación que cumpla todos los requerimientos, funcionales y no funcionales.
Por eso describen qué tiene que pasar y nunca cómo está hecho hoy: no nombran archivos,
componentes ni pantallas del código, y no dicen si algo está construido o no.

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

### III. En el celular y en la computadora

Toda funcionalidad con pantalla se usa completa en el celular y en la computadora, con su
prueba en cada uno: en el celular, con una mano y sin desplazarse hacia el costado; en la
computadora, con el teclado y aprovechando todo el ancho. Cómo se logra lo decide el
diseño: que hoy sean dos interfaces separadas (ADR-014), su disposición, sus componentes,
su paleta y su marca son cómo está hecho hoy, no una regla. Un cambio pensado para uno no
puede romper el otro: se verifica con capturas de los dos, antes y después.

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
cuando sus escenarios tienen pruebas que pasan; lo que solo se puede comprobar en el
mostrador figura «a validar» hasta que Carlos o el Vendedor lo confirman. Ese estado no se
escribe en la especificación: vive en `proyecto/estado.yml`, con las pruebas que lo
respaldan, y es lo único que hay que reiniciar si el código se rehace. Las unitarias
corren en cada push; las de punta a punta cubren los caminos principales, una vez en el
celular y otra en la computadora. Sin meta de cobertura ni mutation testing (ADR-004).

### VII. Seguro por defecto

El repositorio es público: ni datos de proveedores ni secretos entran en él; lo sensible
vive en `privado/`, que no se sube. El `.env` lleva solo variables de entorno, las que cambian de un ambiente a
otro, y la configuración que no depende del ambiente va en un archivo aparte. La
configuración sale del `.env` sin valores por
omisión. Solo entran usuarios autorizados, sin contraseñas (ADR-011); las sesiones se
pueden cerrar a distancia. Siempre HTTPS. En el servidor la app corre sin privilegios y no
publica puertos a internet (ADR-013). Quien implementa una funcionalidad que toca
el acceso, los permisos o datos que salen al navegador revisa esos puntos antes de terminar.

### VIII. Disponibilidad antes que escala, y costo cero

Son tres usuarios y unas 200 ventas por día: importa que esté disponible, no que escale.
La infraestructura no cuesta nada hasta que el sistema muestre resultados (ADR-002). No se
construye nada «para después».

### IX. En castellano y con las palabras del mostrador

Código, comentarios, commits, documentación y textos de la app van en español. Se dice
«cuenta corriente» y no «fiado», «lista» y no «importación», «costo» y no «precio de compra
neto». En pantallas, historias y diagramas se nombra el rol (Administrador, Vendedor,
Comprador), no la persona. En esta primera versión todos los usuarios son Administrador
y el Administrador puede hacer todo; qué podrá cada rol se define más adelante.

### X. Toda decisión queda escrita

Una decisión técnica que afecta a más de una funcionalidad es un ADR, con las opciones
consideradas y el porqué. Un ADR viejo no se reescribe: se le agrega una enmienda. Las
decisiones de negocio de Carlos se anotan con su fecha en la especificación que tocan y en
[docs/decisiones-de-negocio.md](../../docs/decisiones-de-negocio.md).

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

Una funcionalidad, una carpeta en `specs/`. **No hay ramas ni pull requests:** todo se
sube directo a `master`, que es el ambiente de pruebas; lo que no está terminado no se sube
en un estado que rompa las pruebas. Los comandos de Spec Kit no crean rama.

Cuatro roles, y ninguno más:

| Paso | Rol | Cómo | Produce | Aprueba Carlos |
|---|---|---|---|---|
| 1 | Analista de negocio | `/speckit-specify` y `/speckit-clarify`: le pregunta a Carlos hasta poder escribir la regla | `spec.md` | Sí |
| 2 | Diseñador | `/ux`: dos o tres maquetas de la pantalla principal para que Carlos elija | Maquetas y `ux.md` | Sí, elige la maqueta |
| 3 | Planificador | `/speckit-plan` y `/speckit-tasks` | `plan.md` corto y `tasks.md` | No |
| 4 | Desarrollador | `/speckit-implement` | Código, pruebas y el estado al día | Lo prueba en el ambiente de pruebas |

El paso 2 se saltea cuando la funcionalidad no tiene pantallas nuevas. No se usan los
comandos opcionales del kit (análisis de coherencia, listas de control).

**Los cuatro pasos corren en la misma sesión, uno detrás del otro, y los hace el mismo
agente.** Un rol es un paso del trabajo, no un agente aparte: no se lanzan subagentes ni se
abre una sesión por rol, porque cada uno arrancaría vacío y volvería a leer lo mismo. Para
gastar poco:

- Se lee la constitución, el `resumen.md` de la capacidad que se toca y el código que hace
  falta. La `spec.md` y el `ux.md` completos se abren solo en la parte del requerimiento
  que se va a cambiar, o ante una duda que el resumen no resuelve. No se leen las demás
  capacidades, ni los ADR que no vienen al caso.
- Para mirar una pantalla no se levanta el stack ni se arma nada nuevo: se usan las
  herramientas de `tests/capturas/` (una API de mentira y un script de capturas). Lo que les
  falte se agrega ahí, no en una carpeta temporal, para que la sesión siguiente lo encuentre.
- Lo que ya se leyó en la sesión no se vuelve a leer.
- Las preguntas del analista van todas juntas, y las maquetas también.
- Solo si la sesión se cortó se retoma en otra: `spec.md`, la maqueta aprobada y `tasks.md`
  alcanzan para seguir sin la conversación anterior.

No todo cambio pasa por los cuatro:

| Tamaño | Ejemplo | Quién interviene |
|---|---|---|
| Arreglo | Un error o un texto; no cambia ninguna regla | Solo el desarrollador, con su prueba. Sin documentos |
| Cambio de interfaz | Cambia cómo se ve o cómo se usa una pantalla, sin cambiar ninguna regla de negocio | Diseñador y desarrollador: maqueta aprobada por Carlos y código. Sin `spec.md`, `plan.md` ni `tasks.md`; el `ux.md` se toca solo si cambia un requerimiento de interfaz |
| Cambio de regla | Un requerimiento nuevo o modificado dentro de una capacidad | Analista y desarrollador. La regla se escribe directamente en la `spec.md` de la capacidad, sin carpeta propia |
| Funcionalidad nueva | Varias historias o pantallas nuevas | Los cuatro, con carpeta propia: `spec.md`, maquetas y `tasks.md` |

Como nadie revisa después al desarrollador, toda lista de tareas termina con estas tres, y
la funcionalidad no está terminada sin ellas:

1. Una prueba por cada escenario de aceptación, anotada en `proyecto/estado.yml`.
2. Si hay pantallas, comparar el resultado con la maqueta aprobada mediante capturas de
   computadora y de celular, y mostrarle a Carlos las diferencias.
3. Actualizar `proyecto/estado.yml`, incorporar lo nuevo a la `spec.md` de la capacidad,
   escribir el ADR si hubo una decisión técnica y cerrar el issue.

## Convenciones propias sobre Spec Kit

- **Plantillas casi sin tocar.** Los títulos de las plantillas quedan como los trae el kit,
  en inglés, para no apartarse del estándar; el contenido se escribe en castellano. El único
  cambio propio es la fase final de `tasks-template.md`, con las tres tareas de cierre.
- **Identificadores.** Los requerimientos conservan sus IDs (`RF-19`, `RNF-21`) en lugar de
  `FR-001`. Los nuevos siguen la numeración de su capacidad.
- **Una carpeta por capacidad.** Las carpetas `001` a `007` especifican cada capacidad
  completa: todos sus requerimientos, estén construidos o no. Son la especificación vigente.
- **Qué vale hoy.** Al cerrar una funcionalidad, lo que cambia de una capacidad se
  incorpora a la `spec.md` de esa capacidad, con una nota de qué carpeta lo cambió y cuándo.
  La carpeta de la funcionalidad conserva la historia; la de la capacidad, lo vigente.
- **Regla y estado, separados.** `specs/` dice qué tiene que hacer el sistema.
  `proyecto/estado.yml` dice, por requerimiento, si está hecho, qué pruebas lo respaldan y
  en qué se aparta hoy el código de la regla. `tests/trazabilidad.mjs` controla en el CI que
  los dos coincidan.
- **Un resumen por capacidad.** Cada carpeta `001` a `007` tiene un `resumen.md` de 80
  líneas como mucho: cada requerimiento con su ID en una línea, las reglas que más pesan,
  las decisiones de Carlos que la tocan y las preguntas abiertas que frenan. Es lo primero
  que se lee, y lo único si alcanza. Sigue las reglas de `specs/`: no nombra código ni dice
  qué está hecho. Si una capacidad todavía no lo tiene, lo escribe quien la lee completa por
  primera vez, antes de terminar su sesión. Quien cambia una regla actualiza el resumen en
  el mismo cambio; ante una diferencia, manda la `spec.md`.
- **`ux.md` son requerimientos de interfaz:** qué tiene que poder hacer cada rol en cada
  recorrido y con qué reglas, sin atarse a un diseño. En una funcionalidad nueva, el
  diseño concreto va en `specs/NNN/maquetas/`.
- **Índice.** [specs/README.md](../../specs/README.md) lista cada requerimiento y su
  carpeta. Es la entrada para quien llega al proyecto.
- **Fuera de Spec Kit:** los ADR (`docs/adr/`), las decisiones de negocio
  (`docs/decisiones-de-negocio.md`), los manuales de operación (`docs/operacion/`), el
  sistema visual (`docs/sistema-visual.md`) y la gestión del portafolio (`proyecto/`).

## Governance

Esta constitución prevalece sobre cualquier otra práctica del repositorio. Se enmienda con
la aprobación de Carlos, anotando qué cambió y por qué, y subiendo la versión. Cada
rol comprueba su trabajo contra ella antes de entregarlo; lo que la incumple no se cierra.

**Enmienda 1.2.0 (2026-10-10), por decisión de Carlos:** no hay ramas, todo va directo a
`master` (flujo de trabajo); el principio III deja de exigir dos interfaces separadas y pasa
a exigir que todo se use en el celular y en la computadora, sin atar el diseño; y en esta
versión todos los usuarios son Administrador (principio IX).

**Enmienda 1.2.1 (2026-10-10), por decisión de Carlos:** el `.env` lleva solo variables de
entorno; la configuración que no depende del ambiente va aparte (principio VII).

**Enmienda 1.5.0 (2026-10-11), por decisión de Carlos, para gastar menos en cada sesión:**
cada capacidad tiene un `resumen.md` que se lee antes que la especificación completa; un
cambio que es solo de interfaz va con maqueta y código, sin los demás documentos; y las
herramientas para mirar pantallas viven en `tests/capturas/`.

**Version**: 1.5.0 | **Ratified**: 2026-10-10 | **Last Amended**: 2026-10-11
