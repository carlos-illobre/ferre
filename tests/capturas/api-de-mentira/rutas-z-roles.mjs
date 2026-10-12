// Roles y permisos (RF-72, RF-75): la sesión trae sus permisos, los roles se arman con ellos y
// cada usuario tiene varios. Se llama «z» para cargarse último y ganarles a los demás en /usuarios y en la sesión.
// `PUT /mentira/permisos` deja la sesión con los permisos que se le pasan (o con todos), para
// capturar lo que ve cada rol: lo usa `capturar.py --permisos`.
const PERMISOS = [
  ["ventas.registrar", "Vender", "Vender", "Armar una venta, cobrar, anotar «No llevó», elegir el cliente y cambiar el margen dentro de esa venta"],
  ["ventas.ver", "Vender", "Ver las ventas del día", "Abrir «Ventas de hoy»"],
  ["ventas.anular", "Vender", "Anular ventas", "Anular una venta registrada"],
  ["catalogo.margenes", "Catálogo", "Fijar márgenes", "Elegir el margen de un producto en el catálogo: queda guardado"],
  ["catalogo.listas", "Catálogo", "Cargar listas de precios", "Cargar y aplicar la lista de un proveedor; dar de alta proveedores"],
  ["catalogo.duplicados", "Catálogo", "Unir duplicados", "Unir y separar productos repetidos"],
  ["deposito.pedidos", "Depósito", "Encargar compras", "Armar pedidos a proveedores, mandarlos, cancelarlos y cerrarlos"],
  ["deposito.ingresos", "Depósito", "Registrar ingresos", "Registrar la mercadería que llega y anular un ingreso"],
  ["deposito.compras", "Depósito", "Ver las compras", "Ver las compras recientes y sus comprobantes"],
  ["deposito.stock", "Depósito", "Contar y corregir stock", "Contar estanterías y corregir el stock a mano"],
  ["negocio.numeros", "Negocio", "Ver los números del negocio", "Cómo va el negocio: ventas, gastos y dinero invertido en inventario"],
  ["negocio.anomalias", "Negocio", "Ver las anomalías", "Abrir «Anomalías»"],
  ["negocio.actividad", "Negocio", "Ver quién hizo qué", "Abrir el registro de acciones"],
  ["admin.usuarios", "Administración", "Administrar usuarios", "Autorizar personas, asignarles roles, desactivarlas"],
  ["admin.roles", "Administración", "Administrar roles", "Crear roles, cambiarles el nombre y los permisos, borrarlos"],
  ["admin.sesiones", "Administración", "Administrar sesiones", "Ver y cerrar las sesiones de todos y quitar celulares de otros"],
].map(([clave, parte, nombre, detalle]) => ({ clave, parte, nombre, detalle }));
const TODOS = PERMISOS.map((p) => p.clave);

let roles = [
  { id: "r-1", nombre: "Vendedor", permisos: ["ventas.registrar", "ventas.ver", "ventas.anular"] },
  { id: "r-2", nombre: "Comprador", permisos: ["deposito.pedidos", "catalogo.listas", "catalogo.duplicados", "deposito.compras"] },
  { id: "r-3", nombre: "Recepción", permisos: ["deposito.ingresos", "deposito.compras", "deposito.stock", "negocio.anomalias"] },
  { id: "r-4", nombre: "Administrador", permisos: ["admin.usuarios", "admin.roles", "admin.sesiones", "negocio.actividad"] },
  { id: "r-5", nombre: "Gerente", permisos: ["negocio.numeros", "catalogo.margenes", "ventas.ver", "ventas.anular", "deposito.compras", "negocio.anomalias", "negocio.actividad"] },
  { id: "r-6", nombre: "Encargado de sábados", permisos: ["ventas.registrar", "deposito.ingresos"] },
];
let usuarios = [
  { id: "u-1", email: "carlos@ferre.test", nombre: "Carlos", activo: true, creado_en: "2026-08-01T12:00:00Z", roles: ["r-1", "r-2", "r-3", "r-4", "r-5"] },
  { id: "u-2", email: "marta.bress@ferre.test", nombre: "Marta", activo: true, creado_en: "2026-08-03T12:00:00Z", roles: ["r-4", "r-5"] },
  { id: "u-3", email: "nico.mostrador@ferre.test", nombre: "Nicolás", activo: true, creado_en: "2026-08-20T12:00:00Z", roles: ["r-1"] },
  { id: "u-4", email: "lucia.fernandez.deposito@ferre.test", nombre: "Lucía Fernández", activo: false, creado_en: "2026-09-02T12:00:00Z", roles: ["r-3", "r-2"] },
];
let permisosDeLaSesion = TODOS;
const sesion = () => ({ id: "u-1", email: "carlos@ferre.test", nombre: "Carlos", roles: permisosDeLaSesion.length === TODOS.length ? roles.slice(0, 5).map((r) => r.nombre) : ["Rol de la captura"], permisos: permisosDeLaSesion });
const conRoles = (u) => ({ ...u, roles: u.roles.map((id) => roles.find((r) => r.id === id)).filter(Boolean).map((r) => ({ id: r.id, nombre: r.nombre })) });
const conUsuarios = (r) => ({ ...r, usuarios: usuarios.filter((u) => u.roles.includes(r.id)).length });

export default {
  "PUT /mentira/permisos": ({ body }) => { permisosDeLaSesion = body?.permisos?.length ? body.permisos : TODOS; return { permisos: permisosDeLaSesion }; },
  "GET /sesiones/actual": () => ({ id: "s-1", usuario: sesion() }),
  "POST /sesiones/google": ({ body }) => body?.credencial === "no"
    ? [403, { error: "juan.perez@ferre.test no está autorizado. Pedile a quien administra los usuarios que te dé de alta." }]
    : [201, { token: "token-de-mentira", usuario: sesion() }],
  "GET /permisos": () => PERMISOS,
  "GET /roles": () => roles.map(conUsuarios),
  "POST /roles": ({ body }) => {
    if (roles.some((r) => r.nombre.toLowerCase() === body.nombre.toLowerCase())) return [409, { error: `Ya hay un rol que se llama «${body.nombre}»` }];
    const r = { id: `r-${Date.now()}`, nombre: body.nombre, permisos: body.permisos }; roles = [...roles, r]; return [201, conUsuarios(r)];
  },
  "PATCH /roles/:id": ({ params, body }) => {
    if (params.id === "r-4" && body.permisos && !body.permisos.includes("admin.roles")) return [409, { error: "Tiene que quedar al menos una persona activa que pueda administrar usuarios y roles" }];
    roles = roles.map((r) => (r.id === params.id ? { ...r, ...body } : r)); return conUsuarios(roles.find((r) => r.id === params.id));
  },
  "DELETE /roles/:id": ({ params }) => {
    if (usuarios.some((u) => u.roles.includes(params.id))) return [409, { error: "Ese rol lo tiene alguien: primero sacáselo" }];
    roles = roles.filter((r) => r.id !== params.id);
  },
  "GET /usuarios": () => usuarios.map(conRoles),
  "POST /usuarios": ({ body }) => {
    if (usuarios.some((u) => u.email === body.email)) return [409, { error: `${body.email} ya existe` }];
    const u = { id: `u-${Date.now()}`, email: body.email, nombre: body.nombre, activo: true, roles: body.roles ?? [] }; usuarios = [...usuarios, u]; return [201, conRoles(u)];
  },
  "PATCH /usuarios/:id": ({ params, body }) => {
    if (params.id === "u-1" && body.activo === false) return [400, { error: "No podés desactivarte a vos mismo" }];
    usuarios = usuarios.map((u) => (u.id === params.id ? { ...u, ...body } : u)); return conRoles(usuarios.find((u) => u.id === params.id));
  },
};
