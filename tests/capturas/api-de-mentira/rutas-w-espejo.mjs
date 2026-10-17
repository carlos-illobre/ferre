// El espejo entre la computadora y el celular, de mentira: pasa a un lado lo que avisa el otro,
// como el servidor de verdad (decisión 60). Para el clip del manual que muestra cómo la
// computadora sigue al celular (tests/capturas/tutorial/espejo.py).
//
// Cada lado se reconoce por su identificador de dispositivo y su token:
// - la computadora, con un dispositivo que empieza con «con-celular» (como en rutas-vinculo);
// - el celular, con un dispositivo que empieza con «celular-vinculado» y un token que empieza con «celular».
// Los dos quedan en el mismo puesto, pu-1. Va después de rutas-vinculo, que pisa.
const vence = "2099-01-01T00:00:00Z";
const puesto = { id: "pu-1", nombre: "computadora del mostrador", expira_en: vence };
const LADOS = ["computadora", "celular"];
const DOCUMENTOS = ["venta", "ingreso", "pedido", "pedido-renglones"];
const espejo = { parte: null, docs: {}, pausado: false, oyentes: { computadora: new Set(), celular: new Set() } };
const presentes = () => ({ computadora: espejo.oyentes.computadora.size > 0, celular: espejo.oyentes.celular.size > 0 });
const avisarPresencia = () => { const p = presentes(); for (const l of LADOS) espejo.oyentes[l].forEach((o) => o("presencia", p)); };
const ladoDe = (headers) => (String(headers.authorization ?? "").startsWith("Bearer celular") ? "celular" : "computadora");

export default {
  "GET /puestos/mio": ({ query }) => {
    const d = String(query.get("dispositivo") ?? "");
    if (d.startsWith("con-celular")) return { comoComputadora: puesto, comoCelular: null };
    if (d.startsWith("celular-vinculado")) return { comoComputadora: null, comoCelular: puesto };
    return { comoComputadora: null, comoCelular: null };
  },
  "GET /puestos/:id/espejo": ({ headers }) => ({
    flujo: (enviar, alCerrar) => {
      const lado = ladoDe(headers);
      espejo.oyentes[lado].add(enviar);
      enviar("estado", { lado, parte: espejo.parte, docs: espejo.docs, pausado: espejo.pausado, presentes: presentes() });
      avisarPresencia();
      const latido = setInterval(() => enviar("latido", null), 25_000);
      alCerrar(() => { clearInterval(latido); espejo.oyentes[lado].delete(enviar); avisarPresencia(); });
    },
  }),
  "POST /puestos/:id/espejo": ({ headers, body }) => {
    const lado = ladoDe(headers);
    const { tipo, datos } = body ?? {};
    if (tipo === "ir") espejo.parte = datos ?? null;
    else if (DOCUMENTOS.includes(tipo)) espejo.docs[tipo] = datos ?? null;
    else if (tipo === "pausa") espejo.pausado = Boolean(datos);
    const a = tipo === "pausa" ? LADOS : LADOS.filter((l) => l !== lado);
    for (const l of a) espejo.oyentes[l].forEach((o) => o(tipo, tipo === "pausa" ? espejo.pausado : datos));
  },
  // Lo que la computadora le pide al celular vinculado: nada.
  "GET /puestos/avisos": () => ({ lector: false, fotos: [] }),
  "DELETE /puestos/avisos/lector": () => undefined,
  // Para volver a empezar entre una grabación y otra.
  "PUT /mentira/espejo": () => { Object.assign(espejo, { parte: null, docs: {}, pausado: false }); return {}; },
};
