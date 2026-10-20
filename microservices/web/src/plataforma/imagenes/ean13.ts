// Las barras de un código EAN-13: 95 módulos, «1» barra y «0» espacio. Sirve para dibujarlo.
// Un código que no tiene 13 dígitos no se dibuja: null. El dígito verificador no se controla: el
// dibujo acompaña al número, no lo valida.
const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const R = L.map((c) => [...c].map((b) => (b === "1" ? "0" : "1")).join(""));
const G = R.map((c) => [...c].reverse().join(""));
const PARIDAD = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

export function barrasEan13(codigo: string): string | null {
  if (!/^\d{13}$/.test(codigo)) return null;
  const d = [...codigo].map(Number);
  const paridad = PARIDAD[d[0]!]!;
  let bits = "101";
  for (let i = 1; i <= 6; i++) bits += (paridad[i - 1] === "L" ? L : G)[d[i]!];
  bits += "01010";
  for (let i = 7; i <= 12; i++) bits += R[d[i]!];
  return `${bits}101`;
}

// Los módulos de guarda (los de los costados y el del medio) bajan un poco más que el resto.
export const esGuarda = (i: number) => i < 3 || (i >= 45 && i < 50) || i >= 92;
