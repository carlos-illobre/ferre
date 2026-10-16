# Revisión: Secciones de «Cómo va el negocio», cada una con su permiso

**Revisor:** subagente `revisor` (paso 7), 2026-10-15. Revisé `spec.md` (E01 a E19), `plan.md`
(«Seguridad»), `ux.md`, `maquetas/elegida.html`, `tasks.md` y los commits `012-T004` a
`012-T009`.

**Qué corrí:** las pruebas unitarias del servidor (`secciones-de-negocio.test.ts`,
`roles.test.ts`: pasan) y del cliente (`secciones-de-negocio.test.tsx` y `celular/`: pasan),
`node tests/trazabilidad.mjs` (pasa) y capturas con `tests/capturas/` de Ventas, Compras e
Inventario en computadora y celular, con todos los permisos, con uno solo y sin ninguno.
**Qué no corrí:** las pruebas de punta a punta (`tests/e2e.sh`, piden Docker). Lo que dicen
E07, E12, E14 y E19 en esas pruebas lo leí en el código, pero no lo vi pasar.

Gravedad: **frena el cierre** (hay que resolverlo antes de cerrar la funcionalidad) o
**defecto** (se puede anotar en `proyecto/estado.yml` y seguir).

---

## 1. Escenarios sin cumplir o sin prueba que los compruebe

1. **E10 no se cumple en la pantalla.** Frena el cierre.
   - Dónde: `microservices/web/src/pantallas/compu/Inventario.tsx:16-19` y
     `microservices/web/src/pantallas/celular/Deposito.tsx:52-54`; el comentario de
     `microservices/web/src/pantallas/DineroInvertido.tsx:7-9`.
   - Qué dice la especificación: E10 dice que con «Ver el dinero invertido», en Depósito →
     Inventario se ve también el valor en pesos. RF-99 y la decisión 89 piden lo mismo.
   - Qué hace el código: Depósito → Inventario no muestra ningún importe a nadie, tenga el
     permiso o no. Así lo dice la decisión 31 («Inventario sin dinero»), que sigue vigente. El
     servidor manda el valor (eso lo prueba `012-E10` en el servidor), pero ninguna de las dos
     interfaces lo dibuja. La aclaración de la especificación parte de algo que no es cierto
     («el valor en pesos del stock en Depósito → Inventario, que hoy se ve con "Ver los
     números del negocio"»): no se veía.
   - Hay dos salidas: dibujar el valor (columna y total) para quien tiene el permiso, o
     corregir E10, RF-99 y la decisión 89 para que digan que en Depósito no se ve el dinero.
     Elegir entre las dos le toca a Carlos. `proyecto/estado.yml` da RF-99 por «Hecho», y no
     lo está.

2. **E05 por la dirección: la computadora nombra un solo permiso y el celular nombra cuatro.**
   Frena el cierre (son reglas distintas en cada interfaz y contradice la maqueta).
   - Dónde: `microservices/web/src/pantallas/compu/App.tsx:82` y `:123` (la ruta `resumen`
     toma el `pide` de la pestaña Ventas) frente a `microservices/web/src/pantallas/celular/App.tsx:160-163`.
   - Qué dice la especificación: E05 dice «la pantalla dice qué permiso hace falta». `ux.md`
     dice «qué permisos hacen falta y a quién pedírselos». La maqueta (rol «Ninguno») nombra
     los cuatro: «Ver las ventas del negocio», «Ver los gastos», «Ver las compras» o «Ver el
     dinero invertido».
   - Qué hace el código: sin ninguno de los cuatro, `#/resumen` en la computadora dice
     «Hace falta el permiso «Ver las ventas del negocio»». En el celular, `#/mas/negocio`
     nombra los cuatro. Lo comprobé con capturas.
   - Prueba: la unitaria `012-E05` solo compara la lista `pide` de la opción de Más y no mira
     qué dice la pantalla.

3. **E17: la prueba que lo nombra comprueba en realidad E05.** Defecto.
   - Dónde: `tests/e2e/escritorio/13-roles.spec.ts:72-74` y `tests/e2e/celular/13-roles.spec.ts:78-80`.
   - Qué dice la especificación: E17 es alguien **sin** «Ver las ventas del negocio» pero con
     otra sección, que entra por la dirección de Ventas.
   - Qué hace la prueba: usa al Vendedor, que no tiene ninguno de los cuatro permisos. En el
     celular el aviso sale de `elegida.pide` (los cuatro) y no de la regla de la sección
     (`deNegocio.pide`). El caso de E17 de verdad (con Compras o Inventario y sin Ventas) no lo
     prueba nadie. Leyendo el código, el celular (`celular/App.tsx:163`) y la computadora
     (`compu/App.tsx:123`) sí lo cumplen.

4. **Pruebas unitarias que pasan siempre.** Defecto.
   - `secciones-de-negocio.test.tsx:61-69` (`012-E01`, computadora) monta `<ResumenVentas />`
     con todos los permisos. Ese componente no tiene gastos, así que la prueba no puede fallar.
     Tampoco mira que falten las pestañas Compras e Inventario, que es lo que pide E01. En la
     computadora no hay ninguna prueba de E01 a nivel de la aplicación, ni unitaria ni de punta
     a punta.
   - `secciones-de-negocio.test.tsx:54-58` (`012-E12`, computadora) le pasa a `Mas` el destino
     `"gastos"` a mano: no prueba que la aplicación calcule la primera sección visible. La
     prueba de punta a punta `13-roles.spec.ts:154-157` sí lo prueba, pero no la corrí.
   - `secciones-de-negocio.test.tsx:104-110` (`012-E04`, computadora) monta solo
     `ResumenInventario` con `DineroInvertido`, que nunca tiene ventas ni gastos.

5. **Escenarios sin prueba que los nombre, o con prueba parcial.** Defecto.
   - **E13 en la computadora:** ninguna prueba. En la captura, con solo «Ver las ventas del
     negocio» se ve el título y no hay pestañas, así que el código lo cumple.
   - **E07, «quien lo tiene ve la pantalla igual que antes»:** la prueba de punta a punta
     mira la base (que el Gerente tenga los tres permisos y que nadie tenga el viejo) y no lo
     que ve el Gerente.
   - **E19:** la prueba arma el rol con `INSERT` directo en la base
     (`13-roles.spec.ts:148`) y no pasa por quien administra roles, como dice el escenario.
     El permiso se elige en la interfaz en otra prueba (`:94`, con `negocio.ventas`), no con
     «Ver los gastos».
   - **E09 en la pantalla:** solo está probado el servidor. En la pantalla no hace falta
     porque Inventario no muestra dinero a nadie (ver punto 1).
   - **E15 en el celular:** no hay «Actualizar» (ver punto 4.1).

Los demás escenarios (E02, E03, E04, E06, E08, E11, E12, E14, E16, E18) tienen prueba que
los nombra y que comprueba lo que dicen, en el servidor, en la pantalla o en las dos.

## 2. Seguridad

1. **Cada ruta que pedía `negocio.numeros` pasó a uno de los nuevos.** Comprobado, sin fugas
   en lo que pide el plan. `GET /ventas` pide `ventas.ver` o `negocio.ventas`; `GET /consultas`,
   `negocio.ventas`; `GET /compras/semana`, `negocio.gastos`; `GET /stock` manda el valor
   solo con `negocio.invertido`. No queda ninguna mención de `negocio.numeros` en el código,
   salvo la migración 0015, que ya estaba aplicada, y la 0022, que lo borra.
2. **`negocio.numeros` ya no se puede dar a un rol.** Comprobado: sale del catálogo fijo, y
   `012-E18` prueba que `POST /roles` con esa clave da 400.
3. **La migración** (`microservices/api/migrations/0022_secciones_de_negocio.sql`) da los
   tres permisos a cada rol que tenía el viejo (con `ON CONFLICT DO NOTHING` sobre la clave
   `(rol_id, permiso)`) y después borra el viejo. Es correcta. No deja evento, como dice el
   plan. No la vi correr: la prueba de punta a punta la mira y no la corrí.
4. **El dinero invertido se puede calcular desde el navegador sin el permiso.** Defecto (ya
   estaba antes de esta funcionalidad, pero ahora choca con SC-01). Carlos tiene que decidir.
   - Dónde: `microservices/api/src/rutas/productos.ts:12-15` (`GET /productos` le manda
     `costo_neto` a cualquiera con sesión) y `microservices/api/src/rutas/stock.ts:12` (las
     cantidades le llegan a cualquiera con sesión).
   - Qué dice la especificación: SC-01, «ningún importe de gastos ni de inventario llega al
     navegador»; RF-97, «el servidor no lo entrega».
   - Qué hace el código: el total no viaja, pero cantidad × costo de cada producto da el
     dinero invertido, total y por proveedor. El contrato de 007 lo deja escrito a propósito:
     el costo va a cualquiera porque el precio se calcula en el cliente. No es una fuga que
     haya abierto esta funcionalidad, pero el criterio SC-01, tal como está escrito, no se
     cumple.
5. **Los gastos de la semana se pueden calcular sin «Ver los gastos».** Defecto menor.
   `GET /compras` (con `deposito.compras` o `deposito.ingresos`) trae las últimas 50 compras
   con su total y su fecha (`microservices/api/src/compras/datos.ts:70-76`). Sumando las de
   los últimos siete días sale el número que «Ver los gastos» oculta. Que «Ver las compras»
   siga mostrando las compras recientes lo pide la especificación; lo anoto para que Carlos
   sepa que separar esos dos permisos no oculta del todo el gasto.
6. **Datos personales, secretos y entradas nuevas:** no hay nada nuevo, como dice el plan.

## 3. Reglas inventadas

1. **«Ver las ventas de hoy» aparece en Ventas aunque no se tenga «Ver las ventas del día».**
   Defecto.
   - Dónde: `microservices/web/src/pantallas/compu/base/pantallas/Resumen.tsx:79`.
   - Qué dice la documentación: `ux.md` dice «ventas de hoy por medio de pago, con «Ver las
     ventas de hoy»»; 006 dice que ese botón lleva a la pestaña «Hoy» de Vender, que pide
     `ventas.ver`.
   - Qué hace el código: el botón está siempre. Con solo «Ver las ventas del negocio» (E01),
     tocarlo lleva a «No tenés permiso para esta pantalla». Lo vi en la captura con ese único
     permiso: el botón está y Vender no está en el menú. Ninguna regla dice si el botón se
     oculta sin permiso.
2. **La frase de Ventas en la computadora empieza con la fecha** («Hoy, jueves 15 de
   octubre. Lo vendido hoy…», `Resumen.tsx:39`). El celular no la lleva y la maqueta pone la
   fecha en medio de la frase. Defecto menor de texto.
3. **La frase de Compras habla de las dos partes aunque se vea una sola.** Con «Ver los
   gastos» solo (E02) dice «…y las últimas compras, con su comprobante», y las compras no se
   ven (`textos.ts:84-87`, en las dos interfaces). Defecto menor.
4. **`#/negocio` en el celular sigue abriendo Ventas** (`celular/App.tsx`, `subDeNegocio`).
   Es una dirección vieja que se mantiene y no está escrita. Defecto menor de documentación.

## 4. Documentación que quedó atrás

1. **El celular no tiene «Actualizar», y solo lo dice `tasks.md`.** Defecto.
   - E15 («una sección abierta… se toca "Actualizar"») y `ux.md` («"Actualizar" vuelve a traer
     los números de la sección abierta») no dicen que sea solo de la computadora. La maqueta lo
     esconde en el celular (`.arriba .boton{display:none}` en el CSS de `max-width:700px`) y
     `tasks.md` T007 lo anota, pero la spec y el `ux.md` no. Otro agente, leyendo esos dos
     documentos, le pondría el botón al celular.
2. **La decisión 31 y la 89 se contradicen sobre el dinero en Depósito → Inventario** (ver el
   punto 1.1). También quedaron con el texto viejo `DineroInvertido.tsx:7-9` y
   `microservices/api/src/deposito/reglas.ts:8-10` (que sigue diciendo «quien ve los números
   del negocio», con el parámetro `veLosNumeros`). Defecto.
3. **`proyecto/estado.yml`** da RF-99 por «Hecho» sin defectos, y RF-97 tampoco anota los
   puntos 1.2 y 2.4. Defecto.
4. **Lo que muestra la opción de Más no dice lo mismo en las dos interfaces.**
   `textos.ts:79`: el texto largo nombra «las compras» y el corto no; el corto dice
   «el inventario» y el largo «el dinero invertido». La decisión 47 pide que digan lo mismo,
   más largo o más corto. Defecto menor.

## 5. Pantallas (contra `maquetas/elegida.html`)

Lo comparé con capturas de computadora (1366×768) y de celular (390×844).

1. **Inventario, en la computadora y en el celular, no tiene el número «Dinero invertido»
   arriba.** Defecto.
   - La maqueta y `ux.md` (Información, punto 3: «Inventario: «Dinero invertido»») ponen un
     indicador con «El stock por su costo vigente, sin IVA» y debajo la tarjeta por proveedor.
     El código (`Resumen.tsx:121-128`, `celular/ComoVaElNegocio.tsx:36`) muestra solo la
     tarjeta `DineroInvertido`, con el total adentro.
2. **El aviso sin ningún permiso de la computadora** no es el de la maqueta: ver el punto 1.2.
3. **Las pestañas del celular** van con el ícono al lado del nombre y miden 34 px de alto. La
   maqueta las pone con el ícono arriba del nombre y con 60 px de alto mínimo. La captura
   avisa «TOQUE de menos de 44 px» en las tres pestañas. El componente `Pestanas` es el mismo
   de Depósito y Usuarios, así que ya era así; igual es una diferencia con la maqueta
   aprobada. Defecto.
4. **Compras en la computadora:** la maqueta pone «Gastos de la semana» y «Compras recientes»
   en dos columnas, y el código las pone una debajo de la otra. Además, «Compras recientes»
   es una lista que se despliega, con «Anular», como ya era antes. Defecto menor, de forma.
5. **Celular, Ventas:** la tarjeta se llama «Por medio de pago» y en la computadora y en la
   maqueta, «Ventas de hoy por medio de pago». En el celular se ven seis consultas fijas, sin
   «Ver las N». Defecto menor de texto entre interfaces.
6. **Lo demás coincide:** el orden de las pestañas, las pastillas de la computadora con
   «Actualizar» con ícono a la derecha, que no haya «Volver a Más» en la computadora y sí en
   el celular, el título solo con una sección y los tres números de Ventas.

### De paso, en el celular (vale para toda la pantalla, ya estaba antes)

- Los números del celular («Vendido hoy», «Ventas de hoy», «No llevaron hoy», «Gastos de la
  semana») no se explican al tocarlos. El caso borde de la spec («todo número se explica al
  tocarlo… dentro de cada sección») y la regla de 006 lo piden. Defecto.
- Mientras carga o si falla, el celular dice «Sin conexión: … cuando vuelva internet»
  (`celular/ComoVaElNegocio.tsx:70` y `:107`), aunque haya conexión y solo esté cargando o el
  servidor haya negado el pedido. Los estados de 006 (cargando, error, sin conexión) no se
  distinguen. Defecto.

## Qué se hizo con cada punto (2026-10-15)

- **E10 (Depósito → Inventario sin valor para nadie):** queda para Carlos. La decisión 31 dice que Inventario solo muestra cantidades; el servidor ya respeta «Ver el dinero invertido». RF-99 queda «Hecho en parte» hasta que Carlos decida (012-T011).
- **E05 distinto en cada interfaz:** arreglado. En la computadora, sin ninguno de los cuatro permisos se nombran los cuatro, como en el celular.
- **El dinero invertido se puede calcular con `/productos` y `/stock`, y los gastos con `/compras`:** ya era así antes; anotado como defecto en `proyecto/estado.yml` (RF-97) para que decida Carlos.
- **E17 mal etiquetada:** la prueba de antes ahora dice E05, y E17 se prueba con un rol que ve Compras e Inventario y no Ventas, en las dos interfaces.
- **E13 en la computadora sin prueba:** agregada a la de punta a punta, en las dos interfaces.
- **«Ver las ventas de hoy» sin «Ver las ventas del día»:** arreglado: el botón solo aparece con ese permiso.
- **Título de los medios de pago distinto:** arreglado: los dos dicen «Ventas de hoy por medio de pago».
- **Número «Dinero invertido» arriba de Inventario:** se lo preguntamos a Carlos (el bloque ya muestra el total).
- **Pestañas del celular de 34 px con el ícono al lado:** son las mismas de Catálogo, Depósito y Usuarios, que Carlos pidió seguir; se deja así.
- **Compras en una columna en la computadora:** la tabla de compras recientes no entra en media pantalla; se deja así.
- **E15 en el celular y comentarios viejos:** la spec y el `ux.md` dicen que «Actualizar» es solo de la computadora; corregidos los comentarios de `DineroInvertido` y de la regla del stock.
- **Pruebas unitarias de la computadora que no pueden fallar, E07 en la base, E19 con INSERT:** lo que verifican de verdad está en las de punta a punta; se deja anotado.
- **En el celular los números no se explican al tocarlos y dicen «Sin conexión» mientras cargan:** ya era así antes de 012; anotado como defecto en RF-96.
- **Decisiones de Carlos del 2026-10-16 (decisión 90):** Depósito → Inventario mostrará el valor con «Ver el dinero invertido» (012-T012); la sección Inventario queda sin número arriba; los costos del catálogo y los importes de las compras se dejan como estaban, a sabiendas.
