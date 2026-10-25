import { igual, type Texto } from "./base";

export const usuarios = {
  // Más → Usuarios y sus pestañas (decisión 88).
  queHayEnUsuarios: { largo: "Quién entra y desde dónde, qué puede hacer y qué hizo", corto: "Quién entra, qué puede hacer y qué hizo" },
  pestanaUsuarios: {
    largo: "Quién puede entrar a Ferrebress y qué puede hacer cada uno. Se entra con el correo de Google: no hay contraseñas.",
    corto: "Gestioná quién puede entrar y con qué roles. Se entra con Google.",
  },
  autorizarOtro: { largo: "Autorizar a alguien", corto: "Autorizar otro correo de Google" },
  invitarAMas: { largo: "Con su correo de Google ya puede entrar. No hay contraseñas que crear.", corto: "Invitá a más personas de tu negocio." },
  queSonLosRoles: {
    largo: "Cada persona puede lo que le permiten sus roles, y puede tener más de uno. Qué permite cada rol se arma en la pestaña «Roles».",
    corto: "Cada persona puede tener uno o más roles.",
  },
  faltaUnRol: igual("Elegí al menos un rol. Para que no pueda nada, desactivá al usuario."),
  // Buscar, filtrar y ordenar (decisiones 98 y 102).
  buscar: igual("Buscar"),
  email: igual("Email"),
  borrarBusqueda: igual("Borrar la búsqueda"),
  filtros: igual("Filtros"),
  roles: igual("Roles"),
  unoOMas: igual("Seleccioná uno o más"),
  estado: igual("Estado"),
  todos: igual("Todos"),
  activos: igual("Activos"),
  inactivos: igual("Inactivos"),
  quitarFiltros: igual("Quitar filtros"),
  aplicarFiltros: igual("Aplicar filtros"),
  ordenarPor: igual("Ordenar por"),
  porCorreo: igual("Correo"),
  porEstado: igual("Estado"),
  // La tarjeta abierta de cada persona en el celular (decisión 102).
  informacion: igual("Información"),
  sesiones: igual("Sesiones"),
  seUnio: igual("Se unió el"),
  sinSesiones: igual("No tiene sesiones abiertas ni celulares con huella."),
  // La v2 (021, decisión 148).
  acceso: igual("Acceso"),
  invitarAlguien: { largo: "Con su correo de Google ya puede entrar. No hay contraseñas que crear.", corto: "Invitá a alguien de tu negocio" },
  nombreOCorreo: { largo: "Buscá nombre o correo", corto: "Nombre o correo" },
} satisfies Record<string, Texto>;
