# Pantallas: catálogo y precios

Qué hay construido en cada interfaz (ADR-014). La de celular se carga en pantallas de menos
de 900 px; la de computadora, de 900 px para arriba. Las rutas son por hash. Los archivos
están en `clientes/gestion-del-local-web/src/`.

## Celular

Pestaña **Catálogo** (`#/catalogo`), con tres segmentos arriba: Productos, Listas y
Duplicados. Los tres se muestran a cualquier usuario.

| Pantalla | Archivo | Qué muestra |
|---|---|---|
| Catálogo · Productos | `pantallas/Catalogo.tsx` | Buscador con foco y la lista de productos de a 30: foto chica, descripción, marca y proveedor, costo, precio de venta y margen («sin margen», «sin costo» o «20 % a mano»). Flechas, Enter y Shift+1 a Shift+5 también funcionan |
| Ficha del producto (hoja) | `pantallas/Catalogo.tsx` (`FichaProducto`) | Foto, descripción, código del proveedor y de barras; precio de venta con su explicación; los cinco botones de margen y «Otro margen» en porcentaje; los proveedores con su costo y la fecha de su lista, el más barato con ★ y cuál está en uso (se toca otro para usarlo); «¿Cómo se calcula el costo?» y «Bajar el Excel de la lista del …» |
| Catálogo · Listas | `pantallas/Listas.tsx` | Tarjeta de cada lista pendiente de revisar; zona «Cargar una lista nueva»; los proveedores con el estado de su última lista (al día, vigente, vieja si pasó de 45 días, sin lista) y «+ Agregar» para quien administra; las últimas 20 cargas. Si no reconoce el proveedor o la planilla no trae fecha, lo pregunta ahí mismo |
| Revisión de una lista (hoja) | `pantallas/Listas.tsx` (`Revision`) | Proveedor y fecha; avisos; los seis números del resumen (leídos, nuevos, cambian de precio, sin cambio, ya no aparecen, filas salteadas); «Descartar» y «Aplicar N precios», que se reemplazan por la barra de progreso mientras se aplica; la vista previa con los cambios primero y cada costo con su explicación |
| Agregar un proveedor (hoja) | `pantallas/Listas.tsx` (`AltaDeProveedor`) | Nombre, lector, si los precios traen IVA, descuento general y por contado |
| Catálogo · Duplicados | `pantallas/Duplicados.tsx` | Sugerencias lado a lado con el motivo («Mismo código de barras» o «Misma descripción»), «Es el mismo» y «Son distintos»; «Buscar duplicados en todo el catálogo»; «Unir dos productos a mano» (hoja con dos buscadores: conservar y absorber); la lista «Unidos · se pueden separar» |
| Vincular celular | `pantallas/VincularCelular.tsx` | Lo que se abre al leer el QR de la computadora: confirma que el celular quedó vinculado por 12 horas y lleva a Vender; si no hay sesión, pide entrar |

Componentes de esta capacidad que usan otras pantallas del celular:

| Componente | Archivo | Qué muestra |
|---|---|---|
| Escáner | `componentes/Escaner.tsx` | La cámara trasera a pantalla completa con una guía, el último código leído y una caja para tipear el código. Se abre desde Vender y desde Depósito (ingreso y conteo) |
| Foto del producto | `componentes/Foto.tsx` | La foto chica; al tocarla, la grande con la descripción y «Sacar foto» o «Sacar otra foto» |
| Explicación | `componentes/Explicacion.tsx` | El número subrayado; al tocarlo sube una hoja «De dónde sale …» con los pasos numerados |

## Computadora

Menú de arriba con **Productos** y **Listas de precios** para todos, y **Duplicados** solo
para quien administra.

| Pantalla | Archivo | Qué muestra |
|---|---|---|
| Productos (`#/productos`) | `escritorio/pantallas/Productos.tsx` | Buscador con foco y una tabla de a 30 filas: foto, producto (marca y códigos), proveedor con «lista del … ⤓» para bajar el Excel y, si hay más de uno, todos los proveedores con su costo, ★ en el más barato y «usar»; costo con su explicación; los cinco botones de margen; precio de venta con su explicación y «otro margen». Flechas eligen la fila, Shift+1 a Shift+5 fijan el margen, Esc limpia |
| Listas de precios (`#/listas`) | `escritorio/pantallas/Listas.tsx` | Aviso de listas pendientes; el panel plegable «Proveedores: agregar o revisar», abierto, para quien administra; la zona para arrastrar o elegir el archivo; la tabla de proveedores con su última lista aplicada («hace N días», marcada si pasó de 45) y la cantidad de productos; el historial de cargas. Después de aplicar, una tarjeta con el resultado y «Entendido» |
| Revisión de una lista | `escritorio/pantallas/Listas.tsx` (`Revision`) | Ocupa la pantalla de listas: título con proveedor y fecha, los números del resumen, «Filas salteadas» plegado, «Aplicar N precios» y «Descartar» o la barra de progreso, y la tabla de vista previa (código, descripción, marca, costo hasta ahora, costo nuevo, cambio) |
| Duplicados (`#/duplicados`) | `escritorio/pantallas/Duplicados.tsx` | Lo mismo que en el celular, con «Unir dos productos a mano» y «Unidos (N): se pueden separar» como paneles plegables y las uniones en tabla |
| Vincular celular | `escritorio/pantallas/VincularCelular.tsx` | La misma confirmación que en el celular, por si el enlace del QR se abre en una pantalla ancha |

Componentes: `escritorio/componentes/Explicacion.tsx` (el número con un «?» que despliega los
pasos en el lugar), `escritorio/componentes/Foto.tsx` y `componentes/VincularCelular.tsx`
(el enlace «Vincular celular para escanear», el QR y «Celular vinculado», dentro de Vender).

## Mockups

Los que hay en `mockups/` para esta capacidad son todos de la computadora:

| Mockup | Pantalla |
|---|---|
| `mockups/productos.png` | Productos: buscador, costo, botones de margen y precio por producto |
| `mockups/pantalla de Productos-laptop.png` | Productos con una búsqueda hecha: resultados con proveedor y fecha de lista, botones de margen, precio y «sin precio: elegí un margen» |
| `mockups/Listas de precios-estado1.png` | Listas de precios: zona de carga, proveedores con su última lista y últimas cargas |
| `mockups/Listas de precios estado 2.png` | Revisión: resumen (leídos, nuevos, cambian de precio, sin cambio, ya no aparecen, salteadas), «Aplicar» y «Descartar», tabla de vista previa |
| `mockups/Listas de precios estado 3.png` | Resultado después de aplicar |

La interfaz de celular sigue `mockups/Ferre iOS.html`, según `docs/ux.md` y los comentarios
del código; ese archivo no está en el repositorio.
