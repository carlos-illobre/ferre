// Los textos y las listas que comparten el celular y la computadora (decisión 47). Las dos
// interfaces tienen que decir lo mismo: lo que cambia es el largo. En la computadora el texto
// explica, casi como una ayuda; en el celular va resumido porque no entra más. Nunca pueden
// decir cosas distintas. Lo que es igual en las dos va una sola vez.
export type Texto = { largo: string; corto: string };
const igual = (t: string): Texto => ({ largo: t, corto: t });
export const texto = (t: Texto, enCelular: boolean) => (enCelular ? t.corto : t.largo);

export type Medio = "efectivo" | "mercado_pago" | "tarjeta" | "cuenta_corriente";
export const MEDIOS: { valor: Medio; nombre: string; corto: string; tecla: string }[] = [
  { valor: "efectivo", nombre: "Efectivo", corto: "Efectivo", tecla: "F5" },
  { valor: "mercado_pago", nombre: "Mercado Pago", corto: "M. Pago", tecla: "F6" },
  { valor: "tarjeta", nombre: "Tarjeta", corto: "Tarjeta", tecla: "F7" },
  { valor: "cuenta_corriente", nombre: "Cuenta corriente", corto: "Cta. cte.", tecla: "F8" },
];
export type Comprobante = "factura" | "remito" | "sin_comprobante";
export const COMPROBANTES: { valor: Comprobante; nombre: string; corto: string }[] = [
  { valor: "factura", nombre: "Factura", corto: "Factura" },
  { valor: "remito", nombre: "Remito", corto: "Remito" },
  { valor: "sin_comprobante", nombre: "Sin comprobante", corto: "Sin" },
];
// Por qué se corrige un stock. El motivo es obligatorio en las dos interfaces (RF-53).
export const MOTIVOS_DE_AJUSTE = ["Conté la estantería", "Rotura", "Se usó en el local", "Estaba mal cargado"];

// Los roles, con el nombre que llevan en pantalla (la API los llama dueño, admin y mostrador).
export const ROLES: { valor: string; nombre: string }[] = [
  { valor: "admin", nombre: "Administrador" },
  { valor: "dueño", nombre: "Administrador principal" },
  { valor: "mostrador", nombre: "Vendedor y comprador" },
];
export const nombreDeRol = (rol: string) => ROLES.find((r) => r.valor === rol)?.nombre ?? rol;

// Cómo se llama cada pantalla y cada parte, igual en el menú, en el título y en las dos interfaces.
export const NOMBRES = {
  comoVaElNegocio: "Cómo va el negocio",
  usuariosYSesiones: "Usuarios y sesiones",
  quienHizoQue: "Quién hizo qué",
  anomalias: "Anomalías",
  mejorasYErrores: "Mejoras y errores",
  usuariosAutorizados: "Usuarios autorizados",
  sesionesAbiertas: "Sesiones abiertas",
  celularesConHuella: "Mis celulares con huella",
  gastosDeLaSemana: "Gastos de la semana",
  ventasDeHoy: "Ventas de hoy",
};

export const TEXTOS = {
  vender: {
    noLlevo: { largo: "Anotado como «No llevó»: qué pidió y a cuánto se le ofreció.", corto: "Anotado como «No llevó»." },
    sinPrecio: { largo: "Hay productos sin precio: elegí un margen o poné el precio a mano en el renglón marcado.", corto: "Hay productos sin precio: elegí un margen o poné el precio a mano." },
    elegiComoPaga: igual("Elegí cómo paga: efectivo, Mercado Pago, tarjeta o cuenta corriente."),
    faltaElCliente: igual("Cuenta corriente: elegí el cliente."),
    quienLleva: igual("¿Quién lleva a cuenta corriente?"),
    stockNoAlcanza: { largo: "no alcanza: se vende igual, el stock queda en 0 y se anota una anomalía", corto: "no alcanza: se vende igual y queda anotado" },
  },
  inventario: {
    faltaCuantasHay: { largo: "Escribí cuántas hay: un número, cero o más.", corto: "Escribí cuántas hay." },
    faltaElMotivo: { largo: "Elegí un motivo o escribilo: sin motivo no se guarda.", corto: "Falta el motivo: sin motivo no se guarda." },
  },
  usuarios: {
    queHaceCadaRol: {
      largo: "Vendedor y comprador: vende, compra, cuenta y carga listas. Administrador: además administra usuarios, proveedores, duplicados y sesiones, pero no cambia a un Administrador principal. Administrador principal: todo.",
      corto: "Vendedor y comprador: vende, compra, cuenta y carga listas · Administrador: además administra usuarios y sesiones · Administrador principal: todo",
    },
    soloElPrincipal: igual("Eso lo tiene que hacer un Administrador principal."),
  },
} satisfies Record<string, Record<string, Texto>>;
