import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
// La misma versión de la librería que usa la aplicación construida (la ESM), con la corrección de las esquinas.
import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from "@zxing/library/esm/index";
import "../../../plataforma/camara/esquinasDelQR";
import { QR_DE_ENTRADA } from "../../../negocio/entrada";

// El código de la entrada con el isotipo en el centro (decisión 118), dibujado como lo vería una
// cámara perfecta: un recuadro blanco del tamaño del isotipo y, adentro, la F oscura (un
// paralelogramo inclinado, como el marco del isotipo). Lo que tapa lo recupera la corrección H.
function leerConIsotipo(texto: string, escala: number): string | null {
  const q = QRCode.create(texto, { errorCorrectionLevel: QR_DE_ENTRADA.nivel });
  const n = q.modules.size, margen = 4, ancho = (n + 2 * margen) * escala;
  const luz = new Uint8ClampedArray(ancho * ancho).fill(255);
  const pintar = (x: number, y: number, v: number) => { luz[y * ancho + x] = v; };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!q.modules.get(y, x)) continue;
    for (let dy = 0; dy < escala; dy++) for (let dx = 0; dx < escala; dx++) pintar((x + margen) * escala + dx, (y + margen) * escala + dy, 0);
  }
  const lado = Math.round(n * escala * QR_DE_ENTRADA.isotipo), desde = Math.round((ancho - lado) / 2);
  for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
    const u = x / lado, v = y / lado;
    // La F: un paralelogramo que ocupa casi todo el recuadro, inclinado hacia la derecha.
    const enLaF = v > 0.08 && v < 0.92 && u > 0.12 + (1 - v) * 0.2 && u < 0.72 + (1 - v) * 0.2;
    pintar(desde + x, desde + y, enLaF ? 30 : 255);
  }
  try { return new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luz, ancho, ancho)))).getText(); } catch { return null; }
}

describe("el código de la entrada con el isotipo", () => {
  it("007 escenario 12: el escáner de la aplicación lo lee igual, sea cual sea el código", () => {
    const sinLeer: string[] = [];
    for (let i = 0; i < 200; i++) {
      const enlace = `https://carlos-illobre.github.io/ferre/pruebas/#/entrar-compu?codigo=${Buffer.from(`ferrebress-${i}-codigo-de-prueba`).toString("base64url").slice(0, 32)}`;
      if (leerConIsotipo(enlace, i % 2 ? 10 : 7) !== enlace) sinLeer.push(enlace);
    }
    expect(sinLeer).toEqual([]);
  });
});
