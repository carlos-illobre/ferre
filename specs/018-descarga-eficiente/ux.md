# UX: Descarga eficiente

Maquetas aprobadas por Carlos el 2026-10-20: `maquetas/celular-descarga.html` y
`maquetas/compu-descarga.html` (historia 5). Lo demás de esta funcionalidad no cambia cómo se ven
las pantallas: las listas de productos traen de a 50 y los siguientes al llegar al final, con
«Cargando más…» mientras tanto.

## Historia 5: los datos para trabajar sin conexión

- En Configuración, en el celular y en la computadora, «Trabajar sin conexión» con su llave. En la
  computadora arranca habilitada; en el celular, deshabilitada.
  - Habilitada: «Este celular (Esta computadora) guarda lo que falta enviar, para seguir vendiendo
    si se corta internet. Para buscar sin internet, bajá los datos acá abajo.»
  - Deshabilitada: «… no guarda datos del negocio. Si se corta internet, no se puede registrar nada
    hasta que vuelva.»
- Con la llave habilitada, debajo, «Datos para trabajar sin conexión», con un botón en el lugar de
  la llave (44 px de alto):
  - Sin bajar: botón principal «Descargar» y «Todavía no se bajaron. Bajá los productos, el stock y
    los clientes para buscar y vender sin internet. Ocupa unos 10 MB; después, «Actualizar» trae
    solo lo que cambia.»
  - Bajando: botón «Descargando…» apagado, una barra con lo que lleva y «Bajando… 4.500 de 11.240
    productos. Se puede seguir usando la aplicación.» (al actualizar: «Bajando lo que cambió… N
    productos.»).
  - Bajados: botón secundario «Actualizar» y «Bajados el 20/10 a las 14:32: 11.240 productos, su
    stock y los clientes. Sin internet se busca acá. «Actualizar» trae solo lo que cambió desde
    entonces.»
  - Sin conexión, al tocarlo: «Sin conexión: para bajar los datos hace falta internet.», y lo bajado
    antes sigue.
- Sin conexión y sin nada bajado, buscar dice «Sin conexión: para buscar productos hace falta
  internet.»

## Chequeo contra los principios de interfaz

- Las dos interfaces: la misma fila y los mismos textos (con «este celular» o «esta computadora»).
- Tamaños: el botón mide 44 px de alto (decisión 104).
- Colores: los de la paleta; el verde de las llaves para el botón principal y la barra.
