import { igual, type Texto } from "./base";

export const entrar = {
  // Volviendo de Google, mientras se abre la sesión (007-T021). Solo en el celular.
  conectandoConGoogle: igual("Conectando tu cuenta de Google"),
  googleConfirmo: igual("Google confirmó tu cuenta. Ahora Ferrebress abre tu sesión; tarda unos segundos."),
  cuentaVerificada: igual("Cuenta de Google verificada"),
  cuentaVerificadaDetalle: igual("Google confirmó que sos vos."),
  abriendoSesion: igual("Abriendo tu sesión"),
  abriendoSesionDetalle: igual("Ferrebress revisa que tu cuenta esté autorizada…"),
} satisfies Record<string, Texto>;
