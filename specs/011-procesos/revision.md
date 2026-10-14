# Revisión: Procesos (011)

**Fecha:** 2026-10-14. **Revisor:** subagente `revisor` (no vio la conversación: solo los
documentos, el código y las pruebas).

**Qué leí:** `spec.md`, `plan.md` (con «Seguridad»), `ux.md`, `tasks.md`, ADR-019,
`proyecto/estado.yml` (RF-90 a RF-95 y RNF-61), `docs/decisiones-de-negocio.md` (87), los 22
commits `(011-T…)`, el módulo `microservices/procesos/` entero, la ruta de paso y los permisos de
`microservices/api/` y lo que se tocó en `microservices/web/`.

**Qué corrí:**

- Unitarias del módulo web: 53 de 53 pasan.
- Unitarias del servicio: 24 pasan. `datos.test.ts` se saltea sin base: lo corrí aparte contra
  una base nueva y descartable en el Postgres local (`procesos_revision`, borrada al terminar)
  y pasa (2 de 2). **No corre en la CI**, porque ahí no está `PROCESOS_BASE_DE_PRUEBA`.
- `api`: `rutas/procesos.test.ts` y `rutas/roles.test.ts` pasan. `web`: `Procesos.test.tsx` pasa.
- Punta a punta, con el stack levantado: escritorio 4 de 4, celular 5 de 5.
- `pnpm capas` en los dos paquetes del módulo, sin violaciones. `node tests/trazabilidad.mjs`
  da bien.
- En la base local, el rol Gerente tiene `procesos.ver` y `procesos.dibujar`.

**Gravedad:** «frena el cierre» quiere decir que hay que resolverlo (en el código o en la
documentación, según decida Carlos) antes de marcar T012. «Defecto» quiere decir que se puede
anotar en `proyecto/estado.yml` y seguir.

---

## 1. Escenarios sin cumplir

Todos los escenarios, de E01 a E45, tienen al menos una prueba que los nombra. Los que siguen
no se cumplen como dicen, o la prueba que los nombra no comprueba lo que el escenario pide.

### 1.1 E35: no se avisa lo que Procesos no sabe mostrar. **Frena el cierre**

- **Dónde:** `microservices/procesos/web/src/comun/useDibujo.ts:49-59` (importar) y
  `microservices/procesos/web/src/editor/Lienzo.tsx:245` (`importXML`).
- **Qué dice la spec:** el proceso importado «queda como un proceso nuevo en borrador; lo que
  Procesos no sabe mostrar se conserva al volver a exportarlo **y se avisa que no se ve**».
- **Qué hace el código:** importa y abre el proceso, pero no avisa nada. Los avisos que da
  `importXML` (`warnings`) no se leen en ningún lado, y el servicio tampoco compara lo que hay
  en el archivo con lo que `grafoDe` sabe mostrar (`modelo/grafo.ts`, `DESDE_BPMN`).
- **Pruebas:** `EditorCompu.test.tsx` («011-E35») solo comprueba que se crea «Venta (2)» en
  borrador; `reglas.test.ts` («011-E35») comprueba que el BPMN se guarda tal cual. Ninguna prueba
  que algo desconocido se conserve al exportar después de editar, ni que haya aviso.

### 1.2 E01: si nunca se abrió un proceso, se abre el primero en vez de la lista. **Frena el cierre**

- **Dónde:** `microservices/procesos/web/src/estado.ts:113`.
- **Qué dice la spec:** «ve el último proceso que abrió (**o la lista, si nunca abrió uno**)».
- **Qué hace el código:** `l.find((p) => p.id === ultimo)?.id ?? l[0]?.id`. Sin uno abierto
  antes, abre el primero de la lista (el que se cambió último). En la computadora no aparece
  ninguna lista: aparece ese proceso abierto. El comentario del código dice «o el primero».
- **Pruebas:** `EditorCompu.test.tsx` («011-E01») solo prueba el caso de un proceso ya abierto
  antes. Arreglarlo es chico, pero hace falta decidir si cambia el código o el escenario.

### 1.3 E04: la flecha que sale de una decisión no lleva el nombre de la opción. **Defecto**

- **Dónde:** `microservices/procesos/web/src/editor/Lienzo.tsx` (no hay código para esto) y
  `tests/e2e/escritorio/18-procesos.spec.ts:87-92`.
- **Qué dice la spec:** «si sale de una decisión, la flecha lleva el nombre de la opción («Sí»,
  «No»)».
- **Qué hace el código:** en la computadora, una flecha que se une a mano no recibe nombre.
  Nombrarla solo se podría con la edición de rótulos que trae `bpmn-js` (doble clic), que ningún
  documento menciona y que no comprobé. En el celular, las ramas muestran el nombre que ya tiene
  la flecha, o «Sigue» si no tiene. Los únicos que ponen nombre a una flecha son los movimientos
  de la lista (`aplicarFlechas`), y lo copian de la flecha que había.
- **Pruebas:** la prueba de punta a punta une un inicio con una tarea, no una decisión con dos
  pasos: la parte de la decisión no se prueba.

### 1.4 E05: no se prueba que cambiar de carril cambie quién lo hace. **Defecto**

- **Dónde:** `tests/e2e/escritorio/18-procesos.spec.ts:94-104` y
  `tests/e2e/celular/18-procesos.spec.ts:104-120`.
- **Qué dice la spec:** el paso «se mueve con sus flechas y, si cambió de carril, cambia quién lo
  hace».
- **Qué hace el código:** por lo que leí, sí: `grafoDe` (`modelo/grafo.ts`) lee el carril de
  `flowNodeRef`, y eso lo actualiza `bpmn-js` cuando se mueve un paso. Pero las dos pruebas
  mueven el paso sin cambiarlo de carril, y no miran ni las flechas ni el carril. La unitaria
  «011-E06» solo comprueba que el formulario llama a `cambiar` con un lienzo falso. **No lo pude
  comprobar.**

### 1.5 E11: en la tabla solo se puede cambiar el nombre. **Defecto**

- **Dónde:** `microservices/procesos/web/src/compu/EditorCompu.tsx:273` y `:280`.
- **Qué dice la spec:** en E11, «cambiar un dato en la tabla lo cambia en el dibujo»; en RF-91,
  «los pasos también se ven y se cambian como tabla».
- **Qué hace el código:** solo el nombre se puede editar. Tipo, quién lo hace, dónde y con qué
  sigue son texto que no se cambia. Puede ser lo que se quiso, pero ningún documento lo dice.

### 1.6 E33: no se comprueba lo que tiene que llevar la imagen. **Defecto**

- **Dónde:** `microservices/procesos/web/src/comun/exportar.ts:21-53` y
  `tests/e2e/escritorio/18-procesos.spec.ts:145-160`.
- **Qué dice la spec:** una imagen «con el proceso entero, su nombre, su estado y la fecha,
  legible al imprimirla en una hoja A4».
- **Qué hace el código:** escribe el nombre, el estado y la fecha arriba, y dibuja el SVG al
  doble de tamaño, sin ajustarlo a A4. La prueba solo mira que el archivo sea un PNG de más de
  5 KB y con el nombre del proceso. **No pude comprobar** que se lea bien impresa en A4, sobre
  todo en un proceso ancho.

### 1.7 E34 y SC-02: no se comprueba con otro programa. **Defecto**

- **Dónde:** `tests/e2e/escritorio/18-procesos.spec.ts:153`.
- **Qué dice la spec:** el BPMN exportado se abre en otro programa «con los mismos pasos,
  flechas, carriles y posiciones».
- **Qué hace la prueba:** solo comprueba que el archivo tenga `<bpmn:definitions` y «Cobrar».
  **No lo pude comprobar** con otro programa.

### 1.8 E44: solo se prueba el nombre del proceso. **Defecto**

- **Dónde:** `microservices/procesos/web/src/compu/EditorCompu.test.tsx` («011-E44»).
- **Qué dice la spec:** el texto que parece código tiene que verse como texto «en el dibujo, en
  la tabla o en la imagen».
- **Qué hace el código:** por lo que leí, está bien. La tabla es React. El dibujo es texto SVG de
  `bpmn-js`. En la imagen, el nombre va con `fillText` y el SVG se carga como `<img>`, que no
  ejecuta scripts. Pero la prueba solo mira el nombre del proceso en el selector: el nombre de
  un paso no se prueba en el dibujo, en la tabla ni en el PNG.

### 1.9 E40: no se prueba que lo tenga el rol Gerente. **Defecto**

- **Dónde:** `microservices/api/src/rutas/roles.test.ts` («011-E40») y
  `microservices/api/migrations/0021_permisos_de_procesos.sql`.
- **Qué hace la prueba:** comprueba que los dos permisos estén en «Negocio». Que los tenga el rol
  Gerente lo hace la migración y ninguna prueba lo mira. Lo comprobé a mano en la base local, y
  está bien.

### 1.10 E37: no se prueba entrar por la dirección sin permiso. **Defecto**

- **Qué dice la spec:** «si entra a su dirección, ve que no tiene permiso y cuáles hacen falta».
- **Qué hace el código:** por lo que leí, sí lo hace. En la computadora, `compu/App.tsx:109` usa
  el `pide` de la opción de Más. En el celular, `celular/App.tsx:148` usa `elegida.pide`. Las dos
  muestran `SinPermiso`. Pero ninguna prueba de 011 entra a `#/procesos` sin permiso: solo
  miran que Más no ofrezca la opción.

### 1.11 E43: la prueba no corre en la notebook del local. **Defecto**

- **Dónde:** `tests/e2e/escritorio/18-procesos.spec.ts:187`.
- **Qué hace la prueba:** mide en la máquina donde corre, con un límite de 8 s para abrir y 1 s
  para mover. Pasa acá. **No pude comprobar** cómo anda en la notebook del local.

### 1.12 Los datos en Postgres no se prueban en la CI. **Defecto**

- **Dónde:** `microservices/procesos/servidor/src/datos.test.ts:10-14`.
- **Qué pasa:** es la prueba que `estado.yml` muestra para RF-93 y RNF-61, pero solo corre con
  `PROCESOS_BASE_DE_PRUEBA`, que la CI no tiene. Ahí siempre se saltea. Yo la corrí y pasa.

Los demás escenarios (E02, E03, E06 a E10, E12 a E32, E36, E38, E39, E41, E42 y E45) se cumplen
según el código y sus pruebas, con estas salvedades:

- E02: la prueba no mira que el paso caiga donde se soltó, solo que aparezca.
- E09: los botones − y + se prueban con un lienzo falso.
- E31: se prueba en un navegador con tamaño de teléfono, no en un teléfono de verdad, como ya
  dice `estado.yml`.

---

## 2. Seguridad (plan, sección «Seguridad»)

### 2.1 «Qué queda registrado»: los cambios del dibujo no se anotan, y borrar no dice qué. **Frena el cierre**

- **Dónde:** `microservices/api/src/procesos/reglas.ts:17-25` y `:58`.
- **Qué dice el plan:** «cada cambio (crear, **cambiar**, marcar vigente, importar, borrar) en
  "Quién hizo qué" de Ferrebress».
- **Qué hace el código:**
  - **Guardar el borrador no se anota** («pasa a cada rato mientras se dibuja»). Es el único
    pedido que cambia el dibujo, así que «cambiar» queda sin registro. Lo que sí se anota es
    cambiar el nombre y descartar el borrador.
  - **El registro de un borrado no dice qué proceso era.** El servicio responde 204 sin cuerpo,
    así que el evento `proceso.borrado` lleva solo el identificador.
    `compu/base/pantallas/Actividad.tsx` no muestra detalle para ese tipo, y lo que se ve es
    «Proceso borrado» sin nombre. Es justo lo único que no se puede recuperar.
- **Qué hay que hacer:** o el plan dice que guardar el borrador no se anota (en el módulo ya
  queda quién hizo cada versión), o el código lo anota. Y el borrado tendría que llevar el
  nombre.

### 2.2 Lo guardado en el dispositivo queda después de cerrar la sesión. **Defecto**

- **Dónde:** `microservices/procesos/web/src/estado.ts` (claves `procesos.lista`,
  `procesos.proceso.<id>` y `procesos.ultimo`), `microservices/web/src/pantallas/Procesos.tsx:59`
  y `microservices/web/src/almacen.ts:39`.
- **Qué dice el plan:** «Nada de eso sale del servidor del negocio salvo hacia quien tiene
  permiso». Y sobre el celular sin «Trabajar sin conexión»: «no le da ninguno y el módulo no
  guarda nada».
- **Qué hace el código:**
  - Guarda en `localStorage` la lista y los procesos abiertos, con su borrador para quien dibuja.
    No los asocia a ningún usuario y no los borra al cerrar la sesión.
  - En la misma computadora, otra persona con solo «Ver procesos» y sin conexión ve la lista
    guardada por quien dibuja, con los nombres de procesos que están solo en borrador.
    `bpmnAMostrar` sí le oculta el dibujo del borrador.
  - Al deshabilitar «Trabajar sin conexión» en un celular, `borrarLoGuardado` limpia la base
    local de Ferrebress, pero no las claves `procesos.*` de `localStorage`.
- **Gravedad:** el riesgo es bajo (son datos de cómo trabaja el negocio), pero no es lo que dice
  el plan.

### 2.3 Los demás puntos del plan están hechos como dice

- **Quién puede qué:** se controla dos veces.
  - La ruta de paso exige sesión y alguno de los dos permisos (`rutas/procesos.ts:9`).
  - El servicio pide `dibujar` en cada cambio (`exigirDibujar`, `reglas.ts`). Con solo `ver`,
    no manda borradores ni procesos sin vigente (`paraQuien` y `listar`), y `historial` excluye
    el borrador (`datos.ts`, `estado <> 'borrador'`).
- **Cabeceras:** Ferrebress las arma de nuevo y no reenvía las del navegador (`reglas.ts:38-44`).
  El servicio compara el token con `timingSafeEqual`.
- **Lo que entra de afuera:**
  - Nombres de 1 a 120 caracteres, sin saltos de línea.
  - BPMN de hasta 5 MB, leído con `bpmn-moddle`. Además se rechaza `<!DOCTYPE` y `<!ENTITY`.
  - Todo valor va a la base como parámetro.
- **Puertos:** el servicio no publica ninguno (`docker-compose.yml`).
- **Detalles menores:**
  - El tope de 5,5 MB del servicio (`servidor/src/rutas.ts:47`) se mide sobre el JSON. Un BPMN
    de casi 5 MB y con muchas comillas puede pasarlo una vez escapado, y entonces dice «Pesa más
    de 5 MB» sin pesarlo. Defecto menor.
  - Si `anotarEvento` falla después de un cambio que salió bien (`api/src/procesos/reglas.ts:58`),
    la persona recibe un 500 aunque el cambio quedó hecho. Defecto menor.

---

## 3. Reglas inventadas (comportamiento que ninguna regla escrita pide)

1. **Lo que se dibuja sin conexión se manda al volver.** `estado.ts:144` y `:159`. **Defecto.**
   - La aclaración de la spec dice que sin conexión «se pueden mirar los procesos… pero no se
     dibuja: … así no hay dos versiones que unir».
   - Si la conexión se corta con un proceso abierto, el dibujo sigue editable: `dibuja` solo se
     apaga cuando falla traer la lista o abrir un proceso, no cuando falla guardar.
   - Lo que no se guardó queda en memoria y se manda solo con el evento `online`. Si al volver
     hay un 409, se descarta con aviso.
   - Lo prueba `estado.test.tsx` («011-E42 … lo manda cuando vuelve la conexión»), pero ningún
     documento lo dice.
2. **El nombre de un proceso importado.** `useDibujo.ts:55-57`. **Defecto de documentación.**
   Sale del nombre del archivo, sin la extensión y cortado a 110 caracteres. Si ya existe, se le
   agrega « (2)», « (3)»… La spec no dice cómo se llama un proceso importado.
3. **Descartar un borrador sin vigente da error.** `servidor/src/reglas.ts:141`. **Defecto de
   documentación.** El mensaje dice «Este proceso no tiene una versión vigente a la que volver:
   para sacarlo, borralo». Es razonable, pero no está en la spec.
4. **Mensajes y errores de forma que ux.md no lista.** **Defecto de documentación.**
   - «Un paso en paralelo necesita al menos dos salidas» (`modelo/recorrido.ts:65`).
   - «El archivo no tiene ningún proceso» (`servidor/src/bpmn.ts:26`).
   - Una decisión con dos entradas y una salida (la que junta caminos) no se marca como error.
5. **Los errores de forma solo los ve quien dibuja.** `Lienzo.tsx:88` y `EditorCompu.tsx:208`.
   **Defecto.**
   - En el celular, «Falta el inicio» y «Falta el fin» no aparecen nunca.
   - E14 no restringe a quién se le muestran.
6. **Detalles sin documentar, de poca importancia.**
   - La lista de procesos va del cambiado más reciente al más viejo.
   - Mayúsculas más la rueda del mouse mueven el dibujo hacia el costado.
   - Una tarea crece de alto para que entre su nombre (es el modo de cumplir E15).

---

## 4. Documentación que quedó atrás

1. **ux.md no dice dónde va el zoom de la computadora, ni el porcentaje, ni el logo.** El zoom
   está abajo a la izquierda (`estilos.css:105`) y muestra «100 %» (`EditorCompu.tsx`, bloque
   `procesos-zoom`). En la computadora, el logo de bpmn.io queda abajo a la derecha. En ux.md
   solo está el logo del celular. Quien me lanzó dice que eso está anotado en ux.md, y no lo
   encontré. **Defecto.**
2. **La lista de pantallas de Ferrebress que se nombran en un paso** solo está en el código
   (`microservices/web/src/pantallas/Procesos.tsx:16`).
   - Tiene «Vender → Cobrar» y «Depósito → Estanterías».
   - No tiene «Roles», «Configuración» ni «Procesos».
   - Otro agente no podría rearmarla. **Defecto.**
3. **Las decisiones de Carlos posteriores a la 87 no tienen número** en
   `docs/decisiones-de-negocio.md`. Son el orden de las pestañas, los nombres cortos de las
   figuras, volver a la lista, la hoja del paso, el naranja y abrir el panel al elegir. Están en
   la spec o en ux.md, pero CLAUDE.md pide numerarlas. **Defecto.**
4. **El texto de Procesos en Más.** En el celular dice «…, paso a paso» y en la computadora,
   «…, dibujado paso a paso» (`celular/App.tsx:60`). ux.md da solo el segundo. Con la regla de
   textos mínimos puede estar bien, pero ux.md no lo dice. **Defecto menor.**
5. **Los colores por omisión del módulo.** El comentario de `estilos.css` dice que son
   «neutros», y son los de Ferrebress. No es un problema de RNF-61, pero el comentario está mal.
   **Defecto menor.**
6. **Las reglas de los puntos 3.1, 3.2 y 3.3** (mandar al volver la conexión, el nombre de un
   proceso importado y descartar sin vigente) hoy solo están en el código.
7. **Tareas que siguen abiertas.** T013 (estado, `resumen.md` y T115) sigue abierta y la
   capacidad todavía no tiene `resumen.md`, como corresponde en este momento.

---

## 5. Pantallas

- Quien me lanzó dice que la comparación con la maqueta aprobada (T011) ya se hizo. **No volví a
  sacar capturas.**
- Comparé el código con lo que pide ux.md:
  - Figuras en renglones con el panel abierto (`estilos.css:182-183`).
  - Logo sin foco ni atajo (`Lienzo.tsx`, `tabindex=-1`).
  - Celular: «Diagrama» primero y elegida, doce figuras con nombres cortos y el nombre completo
    en `aria-label`, hoja plegable, una sola línea «Arrastrá un paso al dibujo.».
  - El botón de volver cierra lo de encima y después vuelve a la lista.
  - La hoja del paso con una cruz, y los botoncitos de `bpmn-js` por debajo de las hojas.
  - El paso elegido en naranja (`estilos.css:239-241`).
  - Elegir un paso abre su panel.
- Todo eso coincide.
- Las únicas diferencias que encontré son las del punto 4.1, y son de documentación.

---

## Qué se hizo con cada punto

Lo agregó quien programó, después de la revisión (2026-10-14).

**Los que frenaban el cierre, resueltos:**

- **1.1 E35:** al importar se cuenta lo que el archivo trae y acá no se ve, y se avisa. Son tres clases: elementos de BPMN que Procesos no maneja, pasos sin lugar en el dibujo y datos del programa de donde viene. Una prueba de punta a punta importa un archivo así, mira el aviso y comprueba que al exportarlo sale todo. Es la tarea T027; el texto está en ux.md.
- **1.2 E01:** Carlos decidió que se abra el primero de la lista, y se corrigió el escenario. Se agregó la prueba del caso sin un proceso abierto antes. Es la tarea T026.
- **2.1 Qué queda registrado:**
  - Cambiar el borrador se anota en «Quién hizo qué»: el primer cambio de cada persona en cada proceso y, si sigue, uno cada media hora.
  - El borrado lleva el nombre del proceso, que se lee antes de borrar.
  - El plan lo dice así. Es la tarea T028.

**Otro punto resuelto:**

- **3.1 Sin conexión:** si se corta la conexión mientras se dibuja, el dibujo queda para mirar, con el último cambio a la vista. Ese cambio se manda cuando vuelve la conexión. Así cumple la aclaración «sin conexión no se dibuja» sin perder lo último. Es la tarea T029; está en ux.md.

**Los defectos, anotados en el plan del proyecto:**

- Los demás puntos de 1, 2.2, 3 y 4 quedan como tarea T119 en `proyecto/tasks.md`.
- **4.1:** la posición del zoom y del logo en la computadora se escribe en ux.md dentro de esa tarea.
