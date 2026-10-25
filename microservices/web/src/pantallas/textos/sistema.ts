import { igual, type Texto } from "./base";

export const sistema = {
  // Más → Sistema (specs/020): lo que vale para todos los dispositivos.
  queHay: { largo: "Lo que vale para todos los dispositivos: la sesión y el vínculo", corto: "Lo que vale para todos los dispositivos" },
  bajada: { largo: "Cómo se comporta el sistema en todos los dispositivos. Lo cambia solo quien tiene «Administrar el sistema»; nadie lo cambia para el suyo.", corto: "Vale para todos los dispositivos. Lo cambia quien administra el sistema." },
  sesion: igual("Cuánto recuerda la sesión el servidor"),
  sesionDetalle: { largo: "Mientras la recuerda, no le vuelve a preguntar a la base quién es cada persona ni qué puede hacer. Más tiempo gasta menos datos de la base. Lo que se cambia desde la aplicación (desactivar a alguien, sus permisos) vale en el momento; un cambio hecho directamente en la base tarda hasta este tiempo.", corto: "Mientras la recuerda, no le pregunta a la base quién sos. Más tiempo, menos datos de la base." },
  vinculo: igual("Cuántos días dura el vínculo"),
  vinculoDetalle: { largo: "Cuánto dura el vínculo entre un celular y una computadora sin volver a vincularlos. Los vínculos nuevos y los que se renuevan duran esto.", corto: "Cuánto dura el vínculo entre un celular y una computadora sin volver a vincularlos." },
  nota: { largo: "Vale para todos los dispositivos y llega a los que están abiertos en menos de un minuto. Cada cambio queda en «Quién hizo qué».", corto: "Vale para todos. Cada cambio queda en «Quién hizo qué»." },
  llegaEnUnMinuto: { largo: " Llega a los dispositivos abiertos en menos de un minuto.", corto: "" },
  sinConexion: igual("Sin conexión: para cambiar los ajustes del sistema hace falta internet. Se ve lo último que se guardó."),
} satisfies Record<string, Texto>;
