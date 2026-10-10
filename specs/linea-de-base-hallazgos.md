# Lo que encontró la línea de base

Al escribir las especificaciones de lo ya construido (2026-10-10), cada requerimiento que
figuraba hecho se contrastó con las pruebas y el código, por lectura; no se levantó la app.
Esto es lo que no coincidía. Cada punto necesita una decisión de Carlos: o se corrige, o se
abre un issue, o se acepta como está. El detalle de cada uno está en la `spec.md` de su
carpeta, en los escenarios con «Prueba: ninguna» y en los `[NEEDS CLARIFICATION]`.

## Estados que cambiaron

| Requerimiento | Decía | Dice ahora | Por qué |
|---|---|---|---|
| RF-01 | Hecho | Hecho en parte | Los productos que dejan de aparecer en una lista solo se cuentan; no se dan de baja |
| RF-22 | Hecho | Hecho en parte | El ítem libre se vende, pero no se puede dar de alta como producto desde la venta |
| RF-25 | Hecho en parte (solo la tabla) | Hecho en parte, con más detalle | «No llevó» funciona y está probado; faltan el motivo y la vista |
| RNF-30 | Hecho | Hecho en parte | Al unir duplicados se modifican filas del histórico y los renglones de un conteo se borran |
| RNF-56 | Hecho | Hecho en parte | Varios documentos estaban atrasados respecto del código |
| RNF-03 | Parcial | Hecho en parte | Mismo significado, con el detalle de qué falta |

## Por capacidad

### 004-clientes
- No hay forma de cargar un cliente desde la app: `POST /clientes` existe pero ninguna pantalla lo llama. En una instalación limpia no se puede cobrar a cuenta corriente.
- El camino completo de vender a cuenta corriente (elegir cliente y cobrar) no tiene ninguna prueba.
- El permiso `cliente.cuenta_corriente` no se controla en ningún lado.
- La deuda en pantalla no se actualiza después de cobrar, hasta la próxima bajada.
### 006-informacion-del-negocio
- «Gasto semanal» es una ventana móvil de 7 días, no de lunes a domingo; el documento no lo precisaba.
- Que una compra anulada no sume al gasto no tiene prueba.
- En la computadora no hay pantalla Negocio: el gasto se ve en Compras y las ventas de hoy en Vender.
- CU-08 (ver cómo va el negocio) está construido en una parte menor y solo en el celular.
### 005-compras-y-stock
- Cualquier usuario con sesión registra y anula compras, corrige stock y cuenta: las rutas no exigen rol (issue #59, abierto).
- Sin prueba: ingreso con remito o sin comprobante, retomar un conteo interrumpido, cerrar un conteo con productos no contados.
- El servidor de compras, stock y conteos no tiene pruebas unitarias; solo lo cubren las de punta a punta, que no corren en cada push.
- El motivo al corregir el stock a mano es opcional, y RF-53 dice «con el motivo».
- El ingreso de mercadería de la computadora no tiene escáner; solo el del celular.
- En el celular la cantidad contada solo acepta enteros, aunque haya productos a granel.
### 003-ventas
- **RF-22 figuraba «Hecho» y no lo está del todo:** el ítem libre se vende, pero «darlo de alta ahí mismo» no existe. El issue #17 se cerró sin eso y no hay issue que lo siga. Pasa a «Hecho en parte».
- RF-25 tiene más construido de lo que decía el documento («No llevó» funciona y está probado), pero el motivo no se puede cargar desde ninguna pantalla. Ni el motivo ni la vista tienen issue.
- Cualquier usuario con sesión puede anular una venta: las rutas no exigen rol (issue #59).
- Mercado Pago y tarjeta no tienen ninguna prueba que los elija.
- El ítem libre no tiene prueba en la computadora, solo en el celular.
- En el celular, «Ventas de hoy» en Vender solo la ve quien administra; el mostrador las ve en Negocio.
### 007-usuarios-y-acceso
- Los roles Administrador, Vendedor y Comprador todavía no existen en el código: hoy cada usuario tiene uno solo entre dueño, admin y mostrador. Vender, comprar, contar y corregir stock solo piden sesión (issue #59).
- No hay control de «último dueño»: un dueño puede desactivar o bajar de rol a otro dueño.
- Un usuario mostrador no puede vincular ni quitar su huella desde la computadora, porque eso está en Administración.
- RF-72 figura «Pendiente (#59)» en la tabla pero la sección «Fuera de esta etapa» también lo nombraba: hay que definir si entra en esta etapa.
- Sin ninguna prueba: el límite de intentos de entrada, el vencimiento de la sesión a 90 días y la vuelta a la pantalla de entrada cuando la sesión deja de valer.
- `mockups/Entrar.png` quedó viejo: muestra la entrada por QR, que se quitó.
### 002-catalogo-y-precios
- **RF-01 figuraba «Hecho» y no lo está del todo:** los productos que dejan de aparecer en una lista solo se cuentan en el resumen («Ya no aparecen»); al confirmar siguen activos con su último costo. Pasa a «Hecho en parte».
- RF-11 (costo comparable) figura «Pendiente», pero el cálculo con IVA y descuentos en cascada ya está construido, probado y en uso. Falta que Carlos cierre la regla (issue #11).
- En el celular, «Duplicados» se le muestra a cualquier usuario, pero la API se lo niega al mostrador.
- Al unir productos duplicados se modifican filas del histórico de precios, lo que roza la regla de que los históricos no se pisan. Separarlos lo restaura.
- La prueba del escáner es el mismo archivo copiado en las dos carpetas: no hay una variante por interfaz.
- Las pruebas que respaldan la carga de listas no corren en cada push, solo a mano o los lunes.
- Sin prueba: descartar una lista desde la pantalla, elegir el proveedor a mano cuando no se reconoce, unir duplicados a mano, «son distintos».

### 001-base-del-sistema
- **Los respaldos no existen:** ni la copia horaria, ni la semanal, ni la prueba de restauración (issue #19). La documentación anterior los mostraba en presente.
- **La máquina sí guarda datos:** los Excel originales de las listas y las fotos de los productos viven en un volumen del servidor, sin copia. Contradice la decisión de que la máquina no tiene estado (ADR-002).
- Un cambio encolado sin conexión que el servidor rechaza al reconectar se descarta sin avisar, si la pantalla ya no está abierta.
- La letra mínima de 18 px pedida para el celular no se cumple: la base es de 16 px y hay textos de 13 y 11 px.
- `mockups/Ferre iOS.html`, el diseño de referencia del celular, no está en el repositorio.
- No hay ninguna prueba de que el celular no se desplace hacia el costado, ni del tiempo del cambio de margen.
- Los ADR 001 y 003 deciden una API documentada con OpenAPI, y no hay ninguno.
- La prueba de carga mide una base y una búsqueda escritas en la propia prueba, no las de la app.
- El ícono de la app instalada conserva el azul del diseño anterior.
