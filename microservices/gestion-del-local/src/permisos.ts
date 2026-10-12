// Los permisos del sistema (RF-72, ADR-017). Son fijos: cada uno corresponde a un control real
// de alguna ruta. Los roles, que los agrupan, los arma el negocio desde la aplicación. Esta
// lista es la única fuente: la pantalla la pide al servidor. Sumar un permiso es agregarlo
// acá y exigirlo en la ruta; ningún rol lo tiene hasta que alguien se lo dé.
export const PERMISOS = [
  { clave: "ventas.registrar", parte: "Vender", nombre: "Vender", detalle: "Armar una venta, cobrar, anotar «No llevó», elegir el cliente y cambiar el margen dentro de esa venta" },
  { clave: "ventas.ver", parte: "Vender", nombre: "Ver las ventas del día", detalle: "Abrir «Ventas de hoy»" },
  { clave: "ventas.anular", parte: "Vender", nombre: "Anular ventas", detalle: "Anular una venta registrada" },
  { clave: "catalogo.margenes", parte: "Catálogo", nombre: "Fijar márgenes", detalle: "Elegir el margen de un producto en el catálogo, que queda guardado" },
  { clave: "catalogo.listas", parte: "Catálogo", nombre: "Cargar listas de precios", detalle: "Cargar y aplicar la lista de un proveedor; dar de alta proveedores" },
  { clave: "catalogo.duplicados", parte: "Catálogo", nombre: "Unir duplicados", detalle: "Unir y separar productos repetidos" },
  { clave: "deposito.pedidos", parte: "Depósito", nombre: "Encargar compras", detalle: "Armar pedidos a proveedores, mandarlos, cancelarlos y cerrarlos" },
  { clave: "deposito.ingresos", parte: "Depósito", nombre: "Registrar ingresos", detalle: "Registrar la mercadería que llega y anular un ingreso" },
  { clave: "deposito.compras", parte: "Depósito", nombre: "Ver las compras", detalle: "Ver las compras recientes y sus comprobantes" },
  { clave: "deposito.stock", parte: "Depósito", nombre: "Contar y corregir stock", detalle: "Contar estanterías y corregir el stock a mano" },
  { clave: "negocio.numeros", parte: "Negocio", nombre: "Ver los números del negocio", detalle: "Cómo va el negocio: ventas, gastos y dinero invertido en inventario" },
  { clave: "negocio.anomalias", parte: "Negocio", nombre: "Ver las anomalías", detalle: "Abrir «Anomalías»" },
  { clave: "negocio.actividad", parte: "Negocio", nombre: "Ver quién hizo qué", detalle: "Abrir el registro de acciones" },
  { clave: "admin.usuarios", parte: "Administración", nombre: "Administrar usuarios", detalle: "Autorizar personas, asignarles roles, desactivarlas" },
  { clave: "admin.roles", parte: "Administración", nombre: "Administrar roles", detalle: "Crear roles, cambiarles el nombre y los permisos, borrarlos" },
  { clave: "admin.sesiones", parte: "Administración", nombre: "Administrar sesiones", detalle: "Ver y cerrar las sesiones de todos y quitar celulares de otros" },
] as const;
export type Permiso = (typeof PERMISOS)[number]["clave"];
export const CLAVES_DE_PERMISO: readonly string[] = PERMISOS.map((p) => p.clave);
export const nombreDePermiso = (clave: string) => PERMISOS.find((p) => p.clave === clave)?.nombre ?? clave;
// Sin estos dos nadie podría volver a dar permisos: siempre tiene que quedar alguien que los tenga.
export const PARA_ADMINISTRAR: Permiso[] = ["admin.usuarios", "admin.roles"];
