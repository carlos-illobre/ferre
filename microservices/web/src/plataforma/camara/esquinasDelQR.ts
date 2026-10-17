import { NotFoundException, type ResultPoint } from "@zxing/library/esm/index";
import FinderPatternFinder from "@zxing/library/esm/core/qrcode/detector/FinderPatternFinder";

// Corrige cómo @zxing/library (0.23) elige las tres esquinas de un código QR. Es un port viejo
// de zxing: deja de buscar apenas encuentra tres cuadrados parecidos y, si tiene más de tres, se
// queda con los vistos más veces. Así, en uno de cada diez o quince códigos un dibujo de los datos
// que imita una esquina le gana a la de verdad y el código no se lee nunca desde la misma imagen.
// Acá se recorre el cuadro entero y se eligen las tres que mejor forman el triángulo rectángulo
// isósceles de las esquinas, como hace zxing en Java desde la 3.4.
type Esquina = ResultPoint & { getEstimatedModuleSize(): number };
type Buscador = { getPossibleCenters(): Esquina[]; selectBestPatterns(): Esquina[]; haveMultiplyConfirmedCenters(): boolean };

const distancia2 = (a: Esquina, b: Esquina) => (a.getX() - b.getX()) ** 2 + (a.getY() - b.getY()) ** 2;

export function elegirEsquinas(posibles: Esquina[]): Esquina[] {
  const c = [...posibles].sort((a, b) => a.getEstimatedModuleSize() - b.getEstimatedModuleSize());
  let mejores: Esquina[] | null = null;
  let distorsion = Infinity;
  c.forEach((p, i) => c.slice(i + 1).forEach((q, j) => c.slice(i + j + 2).forEach((r) => {
    if (r.getEstimatedModuleSize() > p.getEstimatedModuleSize() * 1.4) return;
    const [a = 0, b = 0, h = 0] = [distancia2(p, q), distancia2(q, r), distancia2(p, r)].sort((x, y) => x - y);
    // Dos lados iguales y la hipotenusa al cuadrado igual a la suma de sus cuadrados.
    const d = Math.abs(h - 2 * b) + Math.abs(h - 2 * a);
    if (d < distorsion) { distorsion = d; mejores = [p, q, r]; }
  })));
  if (!mejores) throw new NotFoundException();
  return mejores;
}

const buscador = FinderPatternFinder.prototype as unknown as Buscador;
buscador.haveMultiplyConfirmedCenters = () => false;
buscador.selectBestPatterns = function (this: Buscador) { return elegirEsquinas(this.getPossibleCenters()); };
