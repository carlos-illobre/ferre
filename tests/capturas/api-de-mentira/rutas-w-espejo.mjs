// La conexión entre la computadora y el celular, de mentira (specs/023 y 025): canales como los del
// servidor, que presentan a los dos lados del vínculo y les pasan lo que se mandan. Las aplicaciones
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
const VINCULO = "vinculo:pu-1";
const ladoDe = (headers) => (String(headers.authorization ?? "").startsWith("Bearer celular") ? "celular" : "computadora");

// Los canales de mentira (specs/025, ADR-030), como los del servidor: cada `GET /canal` abre un
// flujo con los temas de la cabecera X-Temas. El vínculo tiene lados (presencia); los demás temas,
// no. `avisarTema` le avisa algo a quien escuche un tema (la entrada aprobada, por ejemplo).
const canales = new Set();
const conTema = (tema) => [...canales].filter((c) => c.temas.has(tema));
export function avisarTema(tema, datos, salvoLado) {
  for (const c of conTema(tema)) if (salvoLado === undefined || c.temas.get(tema) !== salvoLado) c.enviar("m", { t: tema, d: datos });
}
const avisarPresencia = (tema) => {
  const oyentes = conTema(tema).filter((c) => c.temas.get(tema));
  for (const c of oyentes) c.enviar("m", { t: tema, p: oyentes.some((o) => o.temas.get(tema) !== c.temas.get(tema)) });
};

// El celular de mentira habla el protocolo del enlace (microservices/conexion): un saludo y datos numerados.
let numero = 1;
const comoCelular = (dato) => {
  const n = numero++;
  avisarTema(VINCULO, JSON.stringify({ t: "hola", e: "mentira", desde: n, re: "", rh: 0 }), "celular");
  avisarTema(VINCULO, JSON.stringify({ t: "dato", e: "mentira", n, d: JSON.stringify(dato), s: false }), "celular");
};
const hayCelular = () => conTema(VINCULO).some((c) => c.temas.get(VINCULO) === "celular");
// Una imagen chica, como la foto que mandaría el celular (la aplicación acepta JPEG, PNG o WebP).
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
// Lo que la computadora manda: si pide una foto y no hay celular de verdad, la manda el de mentira.
function alMandarLaComputadora(textos) {
  if (hayCelular()) return;
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
  "GET /canal": ({ headers }) => ({
    flujo: (enviar, alCerrar) => {
      const lado = ladoDe(headers);
      let pedidos = [];
      try { pedidos = JSON.parse(String(headers["x-temas"] ?? "[]")); } catch { /* sin temas */ }
      const canal = { temas: new Map(pedidos.map((p) => [p.t, p.t.startsWith("vinculo:") ? lado : undefined])), enviar };
      canales.add(canal);
      enviar("m", { a: { version: "mock" } });
      canal.temas.forEach((_lado, tema) => avisarPresencia(tema));
      alCerrar(() => { canales.delete(canal); canal.temas.forEach((_lado, tema) => avisarPresencia(tema)); });
    },
  }),
  "POST /canal/:tema": ({ headers, params, body }) => {
    const lado = ladoDe(headers);
    const textos = Array.isArray(body) ? body : [];
    for (const m of textos) avisarTema(params.tema, m, lado);
    if (lado === "computadora") alMandarLaComputadora(textos);
    return undefined;
  },
  "PUT /mentira/escanear": ({ body }) => { comoCelular({ tipo: "codigo", codigo: String(body?.codigo ?? "") }); return { oyentes: conTema(VINCULO).length }; },
  // Para volver a empezar entre una grabación y otra.
  "PUT /mentira/espejo": () => ({}),
};
