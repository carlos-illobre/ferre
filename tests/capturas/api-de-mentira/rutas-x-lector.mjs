// El lector del celular vinculado, de mentira: `PUT /mentira/escanear` con `{ "codigo": "…" }` le
// manda a la computadora ese código, como si el celular lo hubiera escaneado (RF-08). Lo usa el
// capítulo «Catálogo» del manual (tutorial/catalogo.py). Va después de rutas-vinculo, que pisa.
const oyentes = new Set();
let siguiente = 1;
export default {
  "GET /puestos/:id/eventos": () => ({
    flujo: (enviar, alCerrar) => { oyentes.add(enviar); alCerrar(() => oyentes.delete(enviar)); },
  }),
  "POST /puestos/:id/codigos/:codigo/recibido": () => undefined,
  "PUT /mentira/escanear": ({ body }) => {
    const c = { id: `c-${siguiente++}`, codigo: String(body?.codigo ?? ""), creado_en: new Date().toISOString() };
    oyentes.forEach((enviar) => enviar("codigo", c));
    return { oyentes: oyentes.size };
  },
};
