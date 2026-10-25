import { igual, type Texto } from "./base";

export const catalogo = {
  // Catálogo para vender (015): el buscador dice qué busca; resumido en el celular (decisión 47).
  buscar: { largo: "Buscar productos, códigos o marcas…", corto: "Producto, código o marca" },
  // La lista trae de a 50: al llegar al final pide los siguientes (specs/018, E02).
  cargandoMas: igual("Cargando más…"),
  agregar: igual("Agregar"),
  agregarALaVenta: igual("Agregar a la venta"),
  agregado: igual("Agregado a la venta"),
  enStock: igual("en stock"),
  filtros: igual("Filtros"),
  sacarFiltros: igual("Sacar filtros"),
  disponibilidad: igual("Disponibilidad"),
  todos: igual("Todos"),
  conStock: igual("Con stock"),
  sinStock: igual("Sin stock"),
  marca: igual("Marca"),
  buscarMarca: igual("Buscar una marca"),
  todasLasMarcas: igual("Todas las marcas"),
  sinProductosConFiltros: igual("No hay productos con esos filtros."),
  teclaAgregar: igual("agrega el elegido a la venta"),
  // «12 productos con filtros», «Ver 12 productos»: la cantidad, con `cuantosProductos`.
  conFiltros: igual("con filtros"),
  ver: igual("Ver"),
  // La v2 de Productos (decisión 145).
  sinPrecio: igual("sin precio"),
  sinPrecioTitulo: igual("Sin precio"),
  cargarLista: igual("Cargar lista"),
  precioYMargen: igual("Precio · margen"),
  elegiUnProducto: igual("Elegí un producto de la lista para ver su ficha."),
} satisfies Record<string, Texto>;
