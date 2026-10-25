import { igual, type Texto } from "./base";

export const conexion = {
  // El indicador de la conexión entre el celular y la computadora (specs/023, ux.md).
  directa: igual("Directa"),
  servidor: igual("Por el servidor"),
  conectando: igual("Conectando…"),
  soloEnLaCompu: igual("El celular no está abierto"),
  soloEnElCelular: igual("La compu no está abierta"),
  pausa: igual("En pausa"),
  sinConexion: igual("Sin conexión"),
  caminoDirecto: { largo: "Directa, por el wifi del local", corto: "Directa, por el wifi" },
  caminoServidor: igual("Por el servidor de Ferrebress"),
  porLaRed: { largo: "La red del local no deja conectar directo el celular y la computadora.", corto: "El wifi no deja conectar directo con la compu." },
  porElNavegador: igual("Este navegador no permite la conexión directa."),
  seCorto: { largo: "La conexión directa se cortó. Se vuelve a armar la próxima vez que se encuentren los dos.", corto: "La directa se cortó. Se vuelve a armar al encontrarse." },
  probar: igual("Probar conexión directa"),
  cerrar: igual("Cerrar"),
} satisfies Record<string, Texto>;
