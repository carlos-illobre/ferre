// Foto del comprobante de una compra (RF-50): subirla, esperarla desde la computadora y verla.
const FOTO = "5d1f0a52-93a1-4f0e-8c1b-7a2e6d4c9b10.jpg";
let subida = null;
let pedido = null;
const factura = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" font-family="sans-serif"><rect width="600" height="800" fill="#fdfdf8"/><rect x="24" y="24" width="552" height="752" fill="none" stroke="#333"/><text x="48" y="80" font-size="30" font-weight="700">COMODO S.A.</text><rect x="270" y="40" width="60" height="60" fill="none" stroke="#333"/><text x="286" y="84" font-size="40" font-weight="700">A</text><text x="360" y="70" font-size="22">FACTURA</text><text x="360" y="100" font-size="20">N° 0001-00000777</text><text x="48" y="150" font-size="18">Fecha: 11/10/2026</text><line x1="24" y1="180" x2="576" y2="180" stroke="#333"/><text x="48" y="220" font-size="18">10  Cinta aisladora negra 20 m      $1.200,00</text><text x="48" y="255" font-size="18">5   Pincel cerda 2 pulgadas            $900,00</text><text x="360" y="720" font-size="24" font-weight="700">TOTAL $16.500,00</text></svg>`;
export default {
  // Pedido de foto con código QR: el «celular» la manda, o llega sola a los ocho segundos.
  "POST /pedidos-de-foto": ({ body }) => { pedido = { desde: Date.now(), lista: false, para: body?.para ?? "la computadora" }; return [201, { codigo: "pedido-de-prueba", expiraEnSegundos: 600 }]; },
  "GET /pedidos-de-foto/:codigo": ({ params }) => params.codigo !== "pedido-de-prueba" || !pedido ? [404, { error: "El código venció. Pedí otro en la computadora." }] : { para: pedido.para, lista: pedido.lista || Date.now() - pedido.desde > 8000 },
  "POST /pedidos-de-foto/:codigo/foto": () => { if (pedido) pedido.lista = true; return [201, { ok: true }]; },
  "GET /pedidos-de-foto/:codigo/foto": () => { pedido = null; return { tipo: "image/svg+xml", cuerpo: factura }; },
  "POST /compras/fotos": () => { subida = Date.now(); return [201, { foto: FOTO }]; },
  "GET /compras/fotos/:archivo": () => ({ tipo: "image/svg+xml", cuerpo: factura }),
};
