# Revisión: Conexión entre dispositivos (paso 7)

**Revisor:** subagente `revisor`, 2026-10-24. Solo documentos y código; no se cambió nada.

**Qué se leyó:** `spec.md`, `plan.md`, `ux.md`, `tasks.md`, las maquetas de la variante A, ADR-027
y los commits `988e7c7`, `e07f6bd`, `c89d2c2` y `130a3de` (módulo, servidor, web, pruebas y
documentación).

**Qué se corrió:**

- Las unitarias del módulo con cobertura: 53 pasaron, con 100 % de líneas, ramas, funciones y
  sentencias. No hay comentarios que excluyan código de la cobertura.
- `pnpm typecheck` y `pnpm capas` del módulo: sin violaciones.
- Las unitarias de la web: `espejo`, `IndicadorDelVinculo`, `FotoDeFactura`, `PedidosDeLaCompu`,
  `conexion-modulo` y `Sistema`. Pasaron las 29.
- Las del servidor: `puestos` y `sistema`. Pasaron las 16.

**Qué no se pudo comprobar:**

- **Las e2e no se corrieron** (piden el stack en Docker). Lo que digo de ellas sale de leerlas.
- **La pantalla no se capturó:** comparé el código con las maquetas, no una captura. T015 sigue
  abierta.

Gravedades: **FRENA** (frena el cierre) · **DEFECTO** (se puede anotar en `proyecto/estado.yml`) ·
**DOC** (falta documentación).

---

## 1. Escenarios sin cumplir

### 1.1 E26: que venza el vínculo no cierra la sala (FRENA)

- **Dónde:** `microservices/api/src/acceso/reglas.ts:86, 198, 231, 237` y
  `microservices/api/src/acceso/vinculo.ts` (no hay nada que mire `expira_en`).
- **Qué dice la especificación:** E26 y el plan («Seguridad → Cuando deja de valer») piden que,
  al vencer el vínculo, la conexión se corte en el momento en los dos y el puntito desaparezca.
- **Qué hace el código:** la sala se cierra solo al desvincular, al cerrar una sesión a
  distancia, al desactivar a la persona y al reemplazar el vínculo. Al vencer no pasa nada:
  - Los flujos abiertos siguen abiertos y el indicador sigue a la vista.
  - Con la directa armada, los dos se siguen hablando sin límite de tiempo.
  - Por el servidor, recién el primer `POST` después del vencimiento da 404; el enlace se
    reconecta, el `GET` da 404 y se suelta el vínculo de ese lado.
- **Prueba:** ninguna. La que nombra E26
  (`microservices/api/src/rutas/puestos.test.ts:117`) prueba los otros tres casos, no el
  vencimiento.

### 1.2 E22 con éxito: ninguna prueba lo recorre (DEFECTO)

- **Dónde:** `microservices/conexion/src/navegador/enlace.test.ts:97` y
  `tests/e2e/*/20-conexion.spec.ts`.
- **Qué falta:** las pruebas recorren «Probar conexión directa» solo cuando la directa sigue sin
  poderse. La rama «si se puede, los dos pasan a Directa» no la recorre ninguna.

### 1.3 E13: la prueba que lo nombra comprueba otra cosa (DEFECTO)

- **Dónde:** `microservices/web/src/pantallas/IndicadorDelVinculo.test.tsx:45`.
- **Qué hace la prueba:** comprueba que con la directa no se ofrece probar y que la pausa se
  dice.
- **Qué pide E13:** que el estado cambie en los dos a la vez. Eso solo se ve de rebote en las
  e2e, que miran los dos lados.

### 1.4 La historia 4 por el camino del servidor tiene poca prueba (DEFECTO)

- **Qué pide:** la prueba independiente de la historia 4 pide correr el lector, el espejo y la
  foto por los dos caminos.
- **Qué hay:**
  - Por el servidor solo se prueba el lector (`20-conexion.spec.ts`, E07/E08).
  - El espejo (E16) y la foto (E17, E30) por el servidor no tienen e2e. La foto grande en partes
    se prueba solo en la unitaria (`confiable.test.ts:77`).
  - E04 (se corta internet y la directa sigue) tiene solo la unitaria con dobles
    (`enlace.test.ts:44`).

### 1.5 E32: el lector dice «Va a llegar cuando abras la computadora» con la computadora abierta (DEFECTO)

- **Dónde:** `microservices/web/src/puesto.ts:75`.
- **Qué hace el código:** devuelve «espera» siempre que el otro no esté en «directa» o
  «servidor». Eso incluye:
  - «conectando»: la computadora está abierta y se está probando la directa, hasta 5 segundos.
  - «sin-conexion»: el celular no tiene red.
- **Qué pide la especificación:** el texto es solo para la computadora cerrada (`ux.md`, E32).

### 1.6 E29: un dato recibido y no confirmado antes de recargar puede llegar dos veces (DEFECTO)

- **Dónde:** `microservices/conexion/src/navegador/confiable.ts:56, 69-77`.
- **Qué pasa:** el que recargó pierde lo que había recibido. Si recargó entre recibir un dato y
  que llegara su confirmación, el otro se lo reenvía y se entrega de nuevo.
- **Qué pide E29:** «no los que ya había recibido antes de recargar».
- **Cuánto pesa:** la ventana es chica, porque la confirmación sale enseguida, pero existe. La
  prueba (`confiable.test.ts:57`) solo cubre el caso en que el dato no llegó.

### 1.7 SC-003 no se puede cumplir como está escrito (DOC)

- **Dónde:** `microservices/web/src/sesion.tsx:50`.
- **Qué pasa:** el control de la sesión sigue preguntando `/sesiones/actual` cada 30 segundos, y
  eso consulta la base cada vez que el servidor deja de recordar la sesión (60 s de arranque).
  Es de la sesión, no del vínculo, así que RF-138 y E05 se cumplen. Pero SC-003 dice «ninguna
  consulta a la base» en 8 horas.
- **Qué falta:** acotar SC-003 «por el vínculo».

### Escenarios que el código cumple, con prueba que los nombra

E01, E02, E03, E05, E06, E07, E08, E09, E10, E11, E12, E14, E15, E16, E17, E18, E19, E20, E21,
E23, E24, E25, E27, E28, E30, E31 y E33.

- E05 y E10 se prueban contando solo los `POST`, no los `GET`. Como la central no toca la base,
  alcanza.
- Las salvedades de E24 y E28 están en la sección 3.

---

## 2. Seguridad (cada punto del plan)

### Datos que toca: se cumple

- La central no guarda: `central.ts` solo escribe en los flujos abiertos.
- Lo recordado en el dispositivo es `{motivo, en}` en `ferre.enlace.<sala>`.

### Quién puede: se cumple

- Las dos rutas pasan por `exigirSesion` y `ladoEnElPuesto`, y si no corresponde dan 404
  (`microservices/api/src/rutas/puestos.ts:51-59`).
- Lo prueba `puestos.test.ts:100`.

### Cuando deja de valer: incompleto (FRENA)

- Al vencer el vínculo no se cierra la sala: es el punto 1.1.
- Lo demás está hecho y probado: desvincular, cerrar una sesión a distancia y desactivar a la
  persona.

### La conexión directa: se cumple

- No hay servidores STUN ni TURN: `iceServers: []` (`directa.ts:32`, probado en
  `directa.test.ts:131`).
- Las señales viajan solo por la ruta autorizada.

### Qué entra desde afuera: hecho en parte (DEFECTO)

**a) El cuerpo se lee entero antes de mirar el límite.**

- **Dónde:** `microservices/api/src/rutas/puestos.ts:58`.
- **Qué pasa:** `await c.req.text()` lee el cuerpo completo antes de que la central compruebe el
  1 MB. No hay `bodyLimit` en esa ruta: el único está en `rutas/procesos.ts:10`.
- **Riesgo:** una sesión emparejada puede mandar un cuerpo de cualquier tamaño, que se carga en
  memoria antes del 413.

**b) Los límites se miden en caracteres, no en bytes.**

- **Dónde:** `central.ts:75, 78`.
- **Qué pasa:** se usa `.length` (unidades UTF-16); el plan habla de KB y MB.

**c) La foto que llega no se valida.**

- **Dónde:** `microservices/web/src/pedidos-al-celular.ts:119-124`.
- **Qué pasa:** `archivoDe` no mira el tamaño, y un tipo que no reconoce lo toma como
  `image/jpeg`.
- **Qué pide el plan:** que la aplicación valide la foto como cualquier dato de afuera, «una
  imagen de hasta lo que hoy se acepta». Puede ser que la subida posterior lo controle; no lo
  comprobé.

### Secretos y registro: sin cambios, como dice el plan

---

## 3. Reglas inventadas o que se apartan de lo escrito

### 3.1 El espejo al encontrarse: gana el que cambió último, no la computadora (DEFECTO + DOC)

- **Dónde:** `microservices/web/src/espejo.ts:124-126, 185-194`.
- **Qué dice el plan:** «si los dos tienen uno distinto, manda la computadora».
- **Qué hace el código:** queda el que cambió más recientemente (`haceMs`) y solo en empate
  manda la computadora. Con la venta distinta en los dos, puede ganar la del celular.
- **Qué falta:** decidir cuál de las dos reglas vale. Ni RF-77 ni ADR-027 la escriben.

### 3.2 «Desconectar» y «Reconectar» se mudaron al detalle del indicador (DOC)

- **Dónde:** `microservices/web/src/pantallas/IndicadorDelVinculo.tsx:86-88` y
  `celular/App.tsx`.
- **Qué pasó:** antes estaban en el botón de arriba del celular. Ahora son botones del detalle.
- **Qué falta:** no lo dicen `ux.md`, la maqueta ni RF-77 (007).

### 3.3 «Por el servidor» sin motivo, después de que se cortó la directa (DOC)

- **Dónde:** `enlace.ts` del módulo (`seCerro`) y `IndicadorDelVinculo.tsx:31-33`.
- **Qué hace el código:** si la directa se corta (E23), el estado pasa a «Por el servidor» con
  `motivo: null`, y el detalle muestra un texto que no está en `ux.md` («La conexión directa se
  cortó. Se vuelve a armar…», en `textos.ts`).
- **Qué falta:** `ux.md` lista solo los dos motivos.
- **Además:** `proyecto/estado.yml` (RF-137, defectos) dice que en ese caso pasa a «El otro no
  está abierto». Eso pasa solo si también se cae el flujo con el servidor.

### 3.4 Los pedidos de foto del celular no vencen ni se cancelan (DEFECTO)

- **Dónde:** `microservices/web/src/pedidos-al-celular.ts:102-115, 139-142` y
  `FotoParaLaCompu.tsx:102-103`.
- **Qué pasa:**
  - Si la computadora cancela o cierra el pedido, `cancelar` solo deja de escuchar: el celular
    sigue mostrando «La computadora pide una foto» hasta recargar.
  - Si después se saca la foto, se entrega, nadie la escucha y el celular dice «Listo: la foto
    ya está en la computadora». Es falso.
- **Antes:** el pedido vencía a los diez minutos, y RF-50 lo decía; la versión nueva de RF-50
  sacó ese plazo.
- **Qué falta:** una regla que diga qué pasa con un pedido cancelado.

### 3.5 Los mensajes de control no se reenvían si falla un `POST` (DEFECTO)

- **Dónde:** `microservices/conexion/src/navegador/servidor.ts:54`.
- **Qué pasa:** un `POST` que falla vacía la cola. Lo confiable se reenvía al saludarse, pero las
  señales, `sin-directa` y `probar` no:
  - Si se pierde `sin-directa`, el otro lado anota «red» a los 5 segundos aunque el motivo era
    «navegador».
  - Si se pierde `probar`, solo un lado prueba.
- **Qué falta:** el plan no lo menciona.

### 3.6 Una señal malformada deja anotado «red» para siempre (DEFECTO)

- **Dónde:** `mensajes.ts:25-26`, `directa.ts:67`.
- **Qué pasa:** `leer` acepta cualquier `motivo` de texto y cualquier `d` que sea objeto. Una
  señal malformada hace fallar el intento por «red», y eso queda anotado hasta probar a mano.
- **Cuánto pesa:** viene del otro dispositivo de la misma persona, así que el riesgo es bajo.

### 3.7 Dos pestañas del mismo dispositivo (no comprobado)

- **Qué pasa:** la central admite varios oyentes por lado (`central.ts:61`). Con dos pestañas de
  la computadora, las dos ofrecen la directa al mismo celular y se alternan las épocas del
  confiable.
- **Qué falta:** la especificación no dice qué tiene que pasar, y no lo probé.

---

## 4. Documentación que quedó atrás

### 4.1 `tasks.md` no coincide con los commits (DOC)

- T013, T014 y T017 están `[ ]`, pero el commit `130a3de` dice que las hace.
- T015, la comparación con la maqueta, no está hecha.

### 4.2 002 y 007 no se actualizaron (DOC)

- **Qué decían el plan y la spec:** el plan pedía cambiar 002 (RF-08, RF-09: los códigos esperan
  en el celular) y 007 (RF-77: por dónde viaja el espejo y el indicador). Las Assumptions de la
  spec dicen que cambia RF-09.
- **Qué se hizo:** solo cambiaron los `contracts/api.md` de 002 y 007, no sus `spec.md`. RF-77
  sigue diciendo que «Desconectar» está a la vista, y no habla del indicador.

### 4.3 La interfaz base todavía describe el QR para la foto (DOC)

- **Dónde:** `specs/001-base-del-sistema/ux.md:323-324`.
- **Qué dice:** «hay un botón que muestra un código QR para sacarla con el celular». Ya no es
  así.

### 4.4 Ni el plan ni el ADR dicen cómo se cierra el enlace al cerrar la página (DOC)

- **Dónde:** `microservices/web/src/enlace.ts:82-83, 60`.
- **Qué hace el código:**
  - Cierra el enlace con `pagehide` y lo rearma con `pageshow`.
  - Ante un 401, suelta el enlace sin borrar el vínculo, y entonces el celular muestra «Vincular»
    aunque sigue vinculado.

### 4.5 `enlace.ts` de la web no tiene pruebas propias (DEFECTO)

- **Qué falta probar:**
  - El filtro de tipos (`esMensaje`).
  - Que un 404 o el cierre de la sala borren el vínculo local.
  - Lo que hace ante un 401.
- **Qué hay:** las pruebas de pantalla usan un enlace de mentira (`pruebas/enlace-falso.ts`), así
  que esto queda cubierto solo de rebote por las e2e.

---

## 5. Pantallas (contra la variante A aprobada)

Comparado contra el código, no contra una captura.

### 5.1 El título del detalle no dice con quién (DEFECTO)

- **Dónde:** `IndicadorDelVinculo.tsx:74`.
- **Maqueta y `ux.md`:** «Por el servidor con el celular» / «… con la computadora».
- **Código:** solo el estado.

### 5.2 «Con» no dice el nombre del otro dispositivo (DEFECTO)

- **Dónde:** `IndicadorDelVinculo.tsx:59, 67`.
- **Maqueta y `ux.md`:**
  - En el detalle, «Celular de Carlos (Pixel 8)».
  - Debajo del estado, en el botón de la computadora, «Celular de Carlos».
- **Código:** en la computadora pone «Tu celular» en el detalle y «Con tu celular» en el botón.

### 5.3 No está «Probando…» (DEFECTO)

- **Dónde:** `IndicadorDelVinculo.tsx:85`.
- **`ux.md`:** «Mientras se prueba, el botón dice «Probando…» y no se puede tocar de nuevo».
- **Código:** el estado pasa a «Conectando…» y el botón desaparece, porque solo se muestra con
  «servidor».

### 5.4 El detalle tiene un botón de más (DEFECTO + DOC)

- **Dónde:** `IndicadorDelVinculo.tsx:86-88`.
- **Maqueta:** el detalle tiene solo «Probar conexión directa» y «Cerrar».
- **Código:** suma «Desconectar» o «Reconectar». Ver 3.2.

### 5.5 Lo que coincide

Los estados, sus textos (largos y cortos), los colores del puntito (lleno o hueco), el motivo en
un recuadro ámbar con la hora, Escape para cerrar y la hoja desde abajo en el celular.

---

## Resumen

- **Frena el cierre:**
  - **1.1** Al vencer el vínculo no se cierra la sala. Lo piden E26 y la sección «Seguridad» del
    plan.
- **Se puede anotar como defecto:** 1.2 a 1.6; 2, «Qué entra desde afuera»; 3.1 y 3.4 a 3.6;
  4.5; 5.1 a 5.4. De estos, 3.1 (quién gana el espejo) necesita además una decisión de Carlos.
- **Documentación:** 1.7; 3.2 y 3.3; 4.1 a 4.4.
- **RNF-68 se cumple:**
  - Sin dependencias de ejecución, y las capas lo controlan en CI (`pnpm -r typecheck`).
  - 100 % de cobertura, que el `vitest` exige.
  - Cada pieza con su comentario.
  - No encontré código repetido que valga la pena (`cadaTantoReal` de la central y `esperarReal`
    del navegador se parecen, pero uno repite y el otro espera una vez).

---

## Qué se hizo con cada punto (2026-10-24, 023-T018)

| Punto | Qué se hizo |
|---|---|
| 1.1 Vencer el vínculo no cierra la sala | **Arreglado.** Al escuchar la sala, el servidor pone un reloj hasta `expira_en` y la cierra (`acceso/salas.ts`); prueba en `puestos.test.ts` (023-E26) |
| 1.2 E22 con éxito sin prueba | Defecto anotado en `proyecto/estado.yml` (RF-139) |
| 1.3 E13 mal nombrada | Defecto anotado (RF-139) |
| 1.4 Historia 4 por el servidor | Defecto anotado (RF-140): el lector por el servidor sí se prueba de punta a punta (20-conexion); el espejo y la foto, solo por la directa |
| 1.5 E32 con la computadora abierta | **Arreglado:** «Va a llegar cuando abras la computadora» solo con la computadora cerrada; si se está conectando, espera a que llegue |
| 1.6 E29, un dato que puede llegar dos veces | Defecto anotado (RF-137) |
| 1.7 SC-003 | **Corregido en la spec:** «por el vínculo» |
| 2, qué entra desde afuera | **Arreglado en parte:** el cuerpo se corta antes de leerlo (`bodyLimit`) y la foto que llega se valida (JPEG, PNG o WebP, hasta 15 MB). Los límites en caracteres y no en bytes quedan anotados (RF-137) |
| 3.1 Quién gana el espejo | **Se le pregunta a Carlos**; hasta entonces, anotado (RF-140) |
| 3.2, 3.3 | **Documentado** en `ux.md` |
| 3.4 Pedidos de foto que no vencen | Defecto anotado (RF-140) |
| 3.5 Control que no se reenvía | Defecto anotado (RF-137) |
| 3.6 Señal malformada anota «red» | Defecto anotado (RF-137) |
| 3.7 Dos pestañas | No comprobado; anotado (RF-136) |
| 4.1 `tasks.md` | **Corregido** |
| 4.2, 4.3 | **Corregido:** 002 (RF-08, RF-09), 007 (RF-77) y 001 `ux.md` |
| 4.4 Cierre al cerrar la página | **Documentado** en el plan |
| 4.5 `enlace.ts` sin pruebas propias | Defecto anotado (RF-136) |
| 5.1 a 5.4 Pantalla contra la maqueta | **Documentado** en `ux.md` como quedó (el título dice el estado; «Con» dice «Tu celular» porque la computadora no sabe su nombre; mientras se prueba, «Conectando…»; «Desconectar» y «Reconectar» viven en el detalle). Se le muestran a Carlos las capturas |
