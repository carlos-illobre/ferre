// Datos de mentira para el vínculo entre la computadora y el celular. Por omisión no hay nada
// vinculado. Para ver una pantalla con el celular vinculado, la captura guarda como identificador
// del dispositivo uno que empiece con «con-celular» (README, «El vínculo»).
const vence = "2099-01-01T00:00:00Z";
export default {
  // El identificador de Google, que la aplicación le pide al servidor (007-T043).
  "GET /sesiones/google/cliente": () => ({ clienteId: "captura" }),
  "GET /puestos/mio": ({ query }) => String(query.get("dispositivo") ?? "").startsWith("con-celular")
    ? { comoComputadora: { id: "pu-1", nombre: "computadora del mostrador", expira_en: vence }, comoCelular: null }
    : { comoComputadora: null, comoCelular: null },
  // Los flujos de avisos del vínculo: la API de mentira no avisa nada, pero el puesto existe.
  "GET /puestos/:id/eventos": () => "",
  "GET /puestos/:id/espejo": () => "",
};
