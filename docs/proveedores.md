# Proveedores: cómo llegan los precios y qué se puede automatizar

Relevamiento del 2026-09-13 sobre los cuatro proveedores del MVP, a partir de sus
planillas y de sus sitios. Se amplía con el issue #28.

| Proveedor | Cómo llega hoy | Web con precios | Automatizable | Cómo |
|---|---|---|---|---|
| **Ixnova** (HNZ SRL, Castelar) | Excel por mail, 3 hojas, con fecha en el título | **Sí.** Tienda online propia en ixnova.com.ar; precios mayoristas visibles con usuario registrado por CUIT, aprobación inmediata | **Sí, alta** | Conector con usuario del negocio que recorra el catálogo o, mejor, pedirles exportación. Es el candidato del issue #26 |
| **3GE** (Distribuidora 3GE SRL, 3M y otras) | Excel por mail, vía el vendedor | **Parcial.** tresge.com.ar tiene sección de descargas y acceso para clientes con código de cliente y CUIT; la lista de precios parece estar detrás de ese login | **Sí, media** | Con las credenciales del negocio, descargar el archivo de la sección de descargas y pasarlo por el importador. Confirmar con ellos si el archivo es el mismo Excel |
| **ERPA** (ERPA S.A., Suprabond, Villa Madero) | Excel por mail, exportado de su sistema (lista "comercio") | **No para precios mayoristas.** suprabond.com tiene catálogos PDF sin precios; tienda.suprabond.com es Shopify **minorista**, con precios de venta al público, no los de la lista comercio | **Solo por mail** | Ingesta automática del adjunto (issue #25). Los precios minoristas de la tienda sirven como referencia de precio de venta, no de costo |
| **Comodo** | Excel por mail, vía el vendedor (Matias Banegas), con un Drive de ofertas e imágenes | **No identificado.** No se encontró sitio ni razón social; la lista solo referencia una carpeta de Google Drive | **Solo por mail** | Ingesta automática del adjunto (issue #25). Preguntarle al vendedor si tienen portal |

## Observaciones

- **Un mismo vendedor manda varias listas** (Comodo, 3GE, Ixnova llegan desde la misma
  casilla personal de Gmail). El reconocimiento de proveedor en el issue #25 no puede
  basarse solo en el remitente: tiene que mirar el nombre del archivo y el formato.
- Otros proveedores vistos en la bandeja del negocio, para el issue #28: Provemet,
  Casa Gancedo, Bulones DC, Cibasa, Saniplast, Complemet, Distribuidora City Bell,
  Protec (tiene portal "ProtecWeb" con usuario).
- Antes de automatizar el acceso a cualquier portal, pedirle al proveedor una
  exportación oficial o su autorización. Un scraper sin permiso se rompe con cada cambio
  de diseño y puede violar sus condiciones de uso.

## Fuentes

- Ixnova: [ixnova.com.ar](https://www.ixnova.com.ar/), [tienda](https://ixnova.com.ar/tienda/)
- 3GE: [tresge.com.ar](https://www.tresge.com.ar/), [proveedores](https://www.tresge.com.ar/proveedores/)
- ERPA / Suprabond: [suprabond.com](https://www.suprabond.com/), [tienda.suprabond.com](https://tienda.suprabond.com/), [El Ferretero](https://elferretero.com.ar/empresas/?key=ERPA+-+SUPRABOND)
