import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
// La misma versión de la librería que usa la aplicación construida (la ESM), que es la corregida.
import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from "@zxing/library/esm/index";
import "./esquinasDelQR";

// El código dibujado como lo vería una cámara perfecta: cada módulo, un cuadrado de `escala` píxeles,
// con el margen blanco de cuatro módulos.
function leer(texto: string, escala: number): string | null {
  const q = QRCode.create(texto, {});
  const n = q.modules.size, margen = 4, ancho = (n + 2 * margen) * escala;
  const luz = new Uint8ClampedArray(ancho * ancho).fill(255);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!q.modules.get(y, x)) continue;
    for (let dy = 0; dy < escala; dy++) luz.fill(0, ((y + margen) * escala + dy) * ancho + (x + margen) * escala, ((y + margen) * escala + dy) * ancho + (x + margen + 1) * escala);
  }
  try { return new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luz, ancho, ancho)))).getText(); } catch { return null; }
}

describe("las esquinas del código QR", () => {
  // Sin la corrección, 5 de estos 200 no se leían nunca (2026-10-17).
  it("lee todos los enlaces para entrar desde la computadora, sea cual sea el código", () => {
    const sinLeer: string[] = [];
    for (let i = 0; i < 200; i++) {
      const enlace = `http://localhost:4173/#/entrar-compu?codigo=${Buffer.from(`ferrebress-${i}-codigo-de-prueba`).toString("base64url").slice(0, 32)}`;
      if (leer(enlace, i % 2 ? 10 : 7) !== enlace) sinLeer.push(enlace);
    }
    expect(sinLeer).toEqual([]);
  });
});
