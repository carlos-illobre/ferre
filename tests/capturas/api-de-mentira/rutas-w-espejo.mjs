// La conexión entre la computadora y el celular, de mentira (specs/023): una central como la del
// servidor, que presenta a los dos lados de la sala y les pasa lo que se mandan. Las aplicaciones
// arman solas lo demás (la conexión directa, si el navegador la deja). Para el clip del manual que
// muestra cómo la computadora sigue al celular (tests/capturas/tutorial/espejo.py).
//
// Cada lado se reconoce por su identificador de dispositivo y su token:
// - la computadora, con un dispositivo que empieza con «con-celular» (como en rutas-vinculo);
// - el celular, con un dispositivo que empieza con «celular-vinculado» y un token que empieza con «celular».
// Los dos quedan en el mismo puesto, pu-1. Va después de rutas-vinculo, que pisa.
//
// Además hace de celular de mentira para la computadora sola: `PUT /mentira/escanear` con
// `{ "codigo": "…" }` le manda ese código como si el celular lo hubiera leído (RF-08), y una foto
// que la computadora pide le llega sola a los ocho segundos (RF-50).
const vence = "2099-01-01T00:00:00Z";
const puesto = { id: "pu-1", nombre: "computadora del mostrador", expira_en: vence };
const oyentes = { computadora: new Set(), celular: new Set() };
const ladoDe = (headers) => (String(headers.authorization ?? "").startsWith("Bearer celular") ? "celular" : "computadora");
const otro = (lado) => (lado === "computadora" ? "celular" : "computadora");
const avisarPresencia = () => { for (const l of ["computadora", "celular"]) oyentes[l].forEach((o) => o("m", { p: oyentes[otro(l)].size > 0 })); };

// El celular de mentira habla el protocolo del enlace (microservices/conexion): un saludo y datos numerados.
let numero = 1;
const comoCelular = (dato) => {
  const n = numero++;
  for (const o of oyentes.computadora) {
    o("m", { m: JSON.stringify({ t: "hola", e: "mentira", desde: n, re: "", rh: 0 }) });
    o("m", { m: JSON.stringify({ t: "dato", e: "mentira", n, d: JSON.stringify(dato), s: false }) });
  }
};
// Una imagen chica, como la foto que mandaría el celular (la aplicación acepta JPEG, PNG o WebP).
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
// Lo que la computadora manda: si pide una foto y no hay celular de verdad, la manda el de mentira.
function alMandarLaComputadora(textos) {
  if (oyentes.celular.size > 0) return;
  for (const t of textos) {
    try {
      const m = JSON.parse(t);
      const dato = m.t === "dato" ? JSON.parse(m.d) : null;
      if (dato?.tipo === "pedir-foto") setTimeout(() => comoCelular({ tipo: "foto", id: dato.id, imagen: `data:image/png;base64,${PNG}` }), 8000);
    } catch { /* no era un dato entero */ }
  }
}

export default {
  "GET /puestos/mio": ({ query }) => {
    const d = String(query.get("dispositivo") ?? "");
    if (d.startsWith("con-celular")) return { comoComputadora: puesto, comoCelular: null };
    if (d.startsWith("celular-vinculado")) return { comoComputadora: null, comoCelular: puesto };
    return { comoComputadora: null, comoCelular: null };
  },
  "GET /puestos/:id/enlace": ({ headers }) => ({
    flujo: (enviar, alCerrar) => {
      const lado = ladoDe(headers);
      oyentes[lado].add(enviar);
      avisarPresencia();
      alCerrar(() => { oyentes[lado].delete(enviar); avisarPresencia(); });
    },
  }),
  "POST /puestos/:id/enlace": ({ headers, body }) => {
    const lado = ladoDe(headers);
    const textos = Array.isArray(body) ? body : [];
    for (const m of textos) oyentes[otro(lado)].forEach((o) => o("m", { m }));
    if (lado === "computadora") alMandarLaComputadora(textos);
    return undefined;
  },
  "PUT /mentira/escanear": ({ body }) => { comoCelular({ tipo: "codigo", codigo: String(body?.codigo ?? "") }); return { oyentes: oyentes.computadora.size }; },
  // Para volver a empezar entre una grabación y otra.
  "PUT /mentira/espejo": () => ({}),
};
