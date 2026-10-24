# Tareas: la aplicación como la v2

Las sesiones que programan las pantallas no escriben ni corren pruebas (Carlos, 2026-10-24): las
pruebas de las pantallas quedan en pausa en el CI y se arreglan todas juntas al final (T010).

- [x] T001 Especificación (paso 1), con las respuestas de Carlos del 2026-10-24 (decisión 148)
- [x] T002 [interfaz] Maquetas del director de arte, tres versiones por dispositivo, de las pantallas que la v2 no dibujó: Más, Ingreso, Pedidos, Más → Sistema y Vincular (paso 2)
- [ ] T003 [interfaz] Catálogo: Listas de precios y Duplicados como la v2, en el celular y la computadora
- [ ] T004 [interfaz] Depósito: Stock, Compras y Contar como la v2, en el celular y la computadora
- [ ] T005 [interfaz] Negocio: Cómo va el negocio, Usuarios y Quién hizo qué como la v2, en el celular y la computadora
- [ ] T006 [interfaz] Más: Anomalías, Procesos, Mejoras y errores y Configuración como la v2, en el celular y la computadora
- [ ] T007 [interfaz] El marco (menú lateral, pestañas, menú de abajo) revisado contra la v2; en Negocio, las pestañas Resumen · Usuarios · Quién hizo qué (las secciones de Resumen pasan a ser segmentos de la pantalla y Roles, un botón dentro de Usuarios, como la v2) (depende de T003 a T006)
- [ ] T008 Anotar en `proyecto/tasks.md` lo que la v2 trae y el sistema no hace (los lugares vacíos de E02) (depende de T003 a T006)
- [ ] T009 Comparar cada pantalla con su v2 en capturas del celular y la computadora y mostrárselas a Carlos (depende de T007)
- [ ] T010 Las pruebas: arreglar las unitarias de las pantallas y las de punta a punta, sacar la pausa del CI y correr todo (depende de T009)
- [ ] T011 Revisión independiente (paso 7) (depende de T010)

## Lo que la v2 trae y falta

Lo que la v2 muestra y el sistema todavía no hace: el lugar quedó vacío o con «—» (E02). Una línea por cosa, con la pantalla.


- Anomalías → Para revisar (computadora y celular): el stock de antes y de después de cada producto de una venta apartada («9 → 8 un.», «queda 8», «no hay») y el aviso de que al aceptarla se anota una anomalía por falta de stock.
- Anomalías → Para revisar (computadora): la pastilla de cada persona dice «Sin acceso»; la v2 dice «Desactivada» o «Desactivado», que pide saber cómo se nombra cada persona.
- Anomalías → Anotadas (computadora): «Contados después» (cuántos de los productos con anomalías se contaron después) y su barra.
- Anomalías → Anotadas (computadora y celular): el botón «Contar» de cada producto, con su hoja para contarlo, y la marca «Contado hoy».
- Anomalías → Anotadas (computadora y celular): el estante de cada producto («Est. A-03-12») y la hoja de cada producto con las veces que faltó.
- Stock (computadora y celular): el mínimo de cada producto y «Bajo el mínimo» («—»), con su porqué («31 vendidas en 90 días»).
- Stock (computadora y celular): la estantería de cada producto («Est. B-02-01») y buscar por estantería.
- Stock (computadora y celular): «Para revisar» cuenta solo los productos en cero o en negativo; le faltan los que están bajo el mínimo y los que espera un cliente («La espera Rosa, jue 22»).
- Stock (computadora y celular): el filtro «Sin código» con su cuenta, y «Generar código» en el renglón.
- Stock (computadora): «Exportar a Excel», «Etiquetas» (Alt E) y la etiqueta de un producto (la impresora del panel), apagados.
- Stock (computadora y celular): la cuenta de «Qué pedir» («28», «a 4 proveedores»); el botón lleva a Pedidos.
- Stock (celular): deslizar un renglón para «Etiqueta» y «Corregir»; corregir se hace tocando el producto.
- Cómo va el negocio: la ganancia del día y su porcentaje («—»).
- Cómo va el negocio: Semana y Mes en el período (apagados) y la sección Resultado (apagada).
- Cómo va el negocio: lo más vendido del día con foto y posición (RF-61, «—»).
- Cómo va el negocio: el cierre de caja con lo contado, lo esperado y la diferencia (RF-62, «—»).
- Cómo va el negocio: la v2 compara con el mismo día de la semana pasada; quedó con ayer a la misma hora (decisión 111) hasta que Carlos decida.
- Listas de precios (computadora y celular): cómo llegó la lista (por correo, de su portal); el ícono queda el de la planilla y dice «subida hoy 08:12».
- Listas de precios (computadora): el precio de estantería antes y después de cada fila; la columna «Precio en estantería» queda con «—».
- Listas de precios (computadora): cuántas subas de más de 15 % hay (la pastilla dice «—») y filtrar por subas, nuevos o ya no están (las pastillas quedan apagadas; «Cambian» y «Salteadas» sí andan).
- Listas de precios (computadora): «Ver el correo» y «Usar 6 %» del aviso de contado; no se muestran.
- Listas de precios (computadora): los adjuntos que llegaron sin proveedor («1 adjunto sin proveedor»); no se muestra la fila.
- Listas de precios (computadora y celular): «Ver todas» las cargas; se ven las tres últimas.
- Listas de precios (computadora): la foto de cada fila de la planilla; queda el lugar con un ícono.
- Procesos (computadora): el mapa chico del dibujo, abajo a la izquierda.
- Procesos (computadora): el aviso del error de forma flotando junto al paso, con su insignia ámbar (hoy el paso lleva la marca «!» de siempre).
- Procesos (computadora y celular): el nombre de cada carril de costado con su ícono (en el celular, en una pastilla verde) y los pasos dibujados con los íconos de la v2; el dibujo sigue siendo el de bpmn-js.
- Procesos (computadora y celular): la pastilla «hecho con bpmn.io»; queda el logo de bpmn.io como es, porque su licencia no deja cambiarlo.
- Usuarios (computadora): «sin usar 30 días», cuántas personas no entran hace un mes («—»).
- Usuarios (computadora y celular): el punto verde de quien está conectado ahora y «No entró aún» para quien nunca entró.
- Usuarios (computadora): en la ficha, «Último: …», lo último que hizo la persona.
- Usuarios (computadora): «Todo lo que hizo» abre Quién hizo qué sin filtrar por la persona.
- Duplicados (computadora y celular): la foto de cada producto de la sugerencia; queda el lugar con un ícono.
- Duplicados (computadora): el stock y las ventas en «así queda» («16 un. y las 35 ventas»); dice solo los proveedores y de quién sale el costo.
