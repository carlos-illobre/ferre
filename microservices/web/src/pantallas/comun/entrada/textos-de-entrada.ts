import type { Disponibilidad } from "../../../negocio/conexion";
import type { NombreDeIcono } from "../../../ui/iconos";

// Los textos de la entrada, los mismos en el celular y en la computadora: es una sola
// aplicación y se tiene que notar desde la primera pantalla.
export const TEXTOS_DE_ENTRADA = {
  titulo: "Precios al día, ventas y stock de la ferretería.",
  lema: "Vendé, contá y cobrá desde el mostrador o el depósito.", // la versión corta, para la entrada del celular (decisión 117)
  bajada: "Ferrebress es el sistema del mostrador: se usa desde el celular y desde la computadora, con los mismos datos.",
  entrar: "Entrar",
  conElCelular: "Entrá con tu celular",
  pasoLeer: "En el celular, abrí Ferrebress, tocá «Escanear el código de la computadora» y apuntá acá. También sirve la cámara del teléfono.",
  pasoHuella: "Poné la huella en el celular. Esta pantalla entra sola.",
  codigoSeRenueva: "El código se renueva solo cada 5 minutos. No hay contraseñas.",
  comoConHuella: "Acá no hay contraseñas. Entrás con la huella, si ya vinculaste este dispositivo, o con tu cuenta de Google.",
  comoSinHuella: "Acá no hay contraseñas. Entrás con tu cuenta de Google.",
  nota: "Solo entran las personas que un Administrador del negocio autorizó. Si es tu primera vez, pedile que agregue tu correo de Google.",
  // Solo en la entrada de la computadora (decisiones 93 y 118).
  antetitulo: "El sistema del mostrador",
  masRapida: "La forma más rápida",
  conTuUsuario: "Entra con tu usuario, sin contraseñas, en cuanto ponés tu huella.",
  pasos: [
    { titulo: "Apuntá el celular a este código", detalle: "Con la cámara o con «Escanear» en la entrada de Ferrebress." },
    { titulo: "Poné la huella en el celular", detalle: "Si todavía no la vinculaste, entrás con Google ahí mismo." },
  ],
  cambiaEn: "Cambia en",
  sirveUnaVez: "y sirve una vez",
  estaComputadora: "Computadora del mostrador",
  conexion: { "conectando": "Conectando…", "en-linea": "En línea", "sin-conexion": "Sin conexión" } satisfies Record<Disponibilidad, string>,
  protegidos: "Tus datos están protegidos",
  tutorial: "Ver tutorial",
  sinConexion: "Sin conexión. Para entrar se necesita internet: cuando vuelva, probá de nuevo.",
  googleNoResponde: "Google no responde. Revisá la conexión y reintentá.",
};

// Debajo de la tarjeta de la computadora, cada uno en dos renglones: las tres características
// técnicas que más importan (decisión 118).
export const SELLOS: { icono: NombreDeIcono; renglones: [string, string] }[] = [
  { icono: "sin-internet", renglones: ["Una vez dentro, resiste", "cortes de internet"] },
  { icono: "escanear", renglones: ["Busca productos", "por código de barras"] },
  { icono: "dispositivos", renglones: ["Maneja la computadora", "desde el celular"] },
];

export const QUE_HACE: { icono: NombreDeIcono; texto: string }[] = [
  { icono: "vender", texto: "Buscás el producto, decís el precio y cobrás." },
  { icono: "listas", texto: "Los precios se actualizan con las listas de los proveedores." },
  { icono: "stock", texto: "Lo que se vende baja del stock; lo que se compra, sube." },
];

// Cada una de las tres cosas que hace va en dos renglones, cortada donde la corta la referencia:
// después del «;», antes de «con» o después de la primera coma.
export function partirEnDos(texto: string): [string, string] {
  const puntoYComa = texto.indexOf("; ");
  if (puntoYComa >= 0) return [texto.slice(0, puntoYComa + 1), texto.slice(puntoYComa + 2)];
  const con = texto.indexOf(" con ");
  if (con >= 0) return [texto.slice(0, con), texto.slice(con + 1)];
  const coma = texto.indexOf(", ");
  if (coma >= 0) return [texto.slice(0, coma + 1), texto.slice(coma + 2)];
  return [texto, ""];
}
