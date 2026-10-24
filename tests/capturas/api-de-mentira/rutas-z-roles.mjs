// Roles y permisos (RF-72, RF-75): la sesión trae sus permisos, los roles se arman con ellos y
// cada usuario tiene varios. Se llama «z» para cargarse último y ganarles a los demás en /usuarios y en la sesión.
// `PUT /mentira/permisos` deja la sesión con los permisos que se le pasan (o con todos), para
// capturar lo que ve cada rol: lo usa `capturar.py --permisos`.
const PERMISOS = [
  ["ventas.registrar", "Vender", "Vender", "Armar una venta, cobrar, anotar «No llevó», elegir el cliente y cambiar el margen dentro de esa venta"],
  ["ventas.ver", "Vender", "Ver las ventas del día", "Abrir «Ventas de hoy»"],
  ["ventas.anular", "Vender", "Anular ventas del día", "Anular una venta registrada hoy"],
  ["ventas.anular_cualquiera", "Vender", "Anular ventas de cualquier día", "Anular una venta de hoy o de un día anterior"],
  ["catalogo.costos", "Catálogo", "Ver costos", "Ver lo que cobra cada proveedor por un producto y de dónde sale cada precio"],
  ["catalogo.margenes", "Catálogo", "Fijar márgenes", "Elegir el margen de un producto en el catálogo: queda guardado"],
  ["catalogo.listas", "Catálogo", "Cargar listas de precios", "Cargar y aplicar la lista de un proveedor; dar de alta proveedores"],
  ["catalogo.duplicados", "Catálogo", "Unir duplicados", "Unir y separar productos repetidos"],
  ["deposito.pedidos", "Depósito", "Encargar compras", "Armar pedidos a proveedores, mandarlos, cancelarlos y cerrarlos"],
  ["deposito.ingresos", "Depósito", "Registrar ingresos", "Registrar la mercadería que llega y anular un ingreso"],
  ["deposito.compras", "Depósito", "Ver las compras", "Ver las compras recientes y sus comprobantes"],
  ["deposito.stock", "Depósito", "Contar y corregir stock", "Contar estanterías y corregir el stock a mano"],
  ["negocio.ventas", "Negocio", "Ver las ventas del negocio", "Cómo va el negocio → Ventas: lo vendido, cómo se cobró y lo que preguntaron y no llevaron"],
  ["negocio.gastos", "Negocio", "Ver los gastos", "Cómo va el negocio → Compras: los gastos de la semana por proveedor"],
  ["negocio.invertido", "Negocio", "Ver el dinero invertido", "Cómo va el negocio → Inventario, y el valor en pesos del stock en cualquier pantalla"],
  ["negocio.anomalias", "Negocio", "Ver las anomalías", "Abrir «Anomalías»"],
  ["negocio.actividad", "Negocio", "Ver quién hizo qué", "Abrir el registro de acciones"],
  ["procesos.ver", "Negocio", "Ver procesos", "Abrir «Procesos» y mirar los procesos vigentes, sus pasos y su historial"],
  ["procesos.dibujar", "Negocio", "Dibujar procesos", "Todo lo de «Ver procesos», más crear, cambiar, marcar vigentes, importar, exportar y borrar los procesos"],
  ["admin.usuarios", "Administración", "Administrar usuarios", "Autorizar personas, asignarles roles, desactivarlas"],
  ["admin.roles", "Administración", "Administrar roles", "Crear roles, cambiarles el nombre y los permisos, borrarlos"],
  ["admin.sistema", "Administración", "Administrar el sistema", "Más → Sistema: los tiempos y los días del vínculo, para todos"],
].map(([clave, parte, nombre, detalle]) => ({ clave, parte, nombre, detalle }));
const TODOS = PERMISOS.map((p) => p.clave);
const sistema = { sesion_segundos: 60, celular_segundos: 60, vinculo_dias: 30 };

let roles = [
  { id: "r-1", nombre: "Vendedor", permisos: ["ventas.registrar", "ventas.ver", "ventas.anular"] },
  { id: "r-2", nombre: "Comprador", permisos: ["deposito.pedidos", "catalogo.listas", "catalogo.duplicados", "deposito.compras"] },
  { id: "r-3", nombre: "Recepción", permisos: ["deposito.ingresos", "deposito.compras", "deposito.stock", "negocio.anomalias"] },
  { id: "r-4", nombre: "Administrador", permisos: ["admin.usuarios", "admin.roles", "negocio.actividad"] },
  { id: "r-5", nombre: "Gerente", permisos: ["negocio.ventas", "negocio.gastos", "negocio.invertido", "catalogo.margenes", "ventas.ver", "ventas.anular", "deposito.compras", "negocio.anomalias", "negocio.actividad", "procesos.ver", "procesos.dibujar"] },
  { id: "r-6", nombre: "Encargado de sábados", permisos: ["ventas.registrar", "deposito.ingresos"] },
];
let usuarios = [
  { id: "u-1", email: "carlos@ferre.test", nombre: "Carlos", activo: true, creado_en: "2026-08-01T12:00:00Z", roles: ["r-1", "r-2", "r-3", "r-4", "r-5"] },
  { id: "u-2", email: "marta.bress@ferre.test", nombre: "Marta", activo: true, creado_en: "2026-08-03T12:00:00Z", roles: ["r-4", "r-5"] },
  { id: "u-3", email: "nico.mostrador@ferre.test", nombre: "Nicolás", activo: true, creado_en: "2026-08-20T12:00:00Z", roles: ["r-1"] },
  { id: "u-4", email: "lucia.fernandez.deposito@ferre.test", nombre: "Lucía Fernández", activo: false, creado_en: "2026-09-02T12:00:00Z", roles: ["r-3", "r-2"] },
];
let permisosDeLaSesion = TODOS;
// Procesos (rutas-procesos.mjs) responde según lo que puede la sesión.
export const permisosDeMentira = () => permisosDeLaSesion;
let codigoAprobado = false;
const sesion = () => ({ id: "u-1", email: "carlos@ferre.test", nombre: "Carlos", roles: permisosDeLaSesion.length === TODOS.length ? roles.slice(0, 5).map((r) => r.nombre) : ["Rol de la captura"], permisos: permisosDeLaSesion });
const conRoles = (u) => ({ ...u, roles: u.roles.map((id) => roles.find((r) => r.id === id)).filter(Boolean).map((r) => ({ id: r.id, nombre: r.nombre })) });
const conUsuarios = (r) => ({ ...r, usuarios: usuarios.filter((u) => u.roles.includes(r.id)).length });

export default {
  "PUT /mentira/permisos": ({ body }) => { permisosDeLaSesion = body?.permisos?.length ? body.permisos : TODOS; return { permisos: permisosDeLaSesion }; },
  "GET /sesiones/actual": () => ({ id: "s-1", usuario: sesion(), ajustes: { celular_segundos: sistema.celular_segundos } }),
  // Más → Sistema (specs/020).
  "GET /sistema/ajustes": () => ({ ...sistema, tramos: { sesion_segundos: [0, 30, 60, 300, 600], celular_segundos: [5, 30, 60, 300, 600] } }),
  "PUT /sistema/ajustes": ({ body }) => { Object.assign(sistema, body ?? {}); return { ...sistema, tramos: { sesion_segundos: [0, 30, 60, 300, 600], celular_segundos: [5, 30, 60, 300, 600] } }; },
  "POST /sesiones/google": ({ body }) => body?.credencial === "no"
    ? [403, { error: "juan.perez@ferre.test no está autorizado. Pedile a quien administra los usuarios que te dé de alta." }]
    : [201, { token: "token-de-mentira", usuario: sesion() }],
  // Entrar a la computadora con el celular (RF-76): el código nunca se aprueba solo; con
  // `PUT /mentira/aprobar-codigo` la próxima consulta de la computadora la deja entrar.
  "POST /sesiones/vinculaciones": () => [201, { id: "v-1", codigo: "codigo-de-mentira", clave: "clave-de-mentira", expiraEnSegundos: 300 }],
  "PUT /mentira/aprobar-codigo": () => { codigoAprobado = true; return {}; },
  "POST /sesiones/vinculaciones/aprobar": ({ body }) => (body?.codigo === "vencido" ? [410, { error: "Ese código venció o ya se usó. Leé el que la computadora muestra ahora." }] : { dispositivo: "computadora · Chrome" }),
  "POST /sesiones/vinculaciones/:id/estado": () => { if (!codigoAprobado) return { estado: "pendiente" }; codigoAprobado = false; return { estado: "aprobada", token: "token-de-mentira", usuario: sesion() }; },
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
