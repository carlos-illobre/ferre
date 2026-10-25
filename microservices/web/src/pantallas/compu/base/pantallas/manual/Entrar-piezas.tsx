import MARCAS from "../manual-entrar-marcas.json";
import { Figura, type Dispositivo } from "./piezas";

// El capítulo «Entrar» (012-T010, maqueta manual-entrar-v2.html; repartido por dispositivo en
// 012-T013, maqueta manual-dispositivo.html): para el empleado de mostrador, una sección por cada
// forma de entrar en el dispositivo elegido, con frases cortas y una acción por paso. Entrar a la
// computadora con el celular va con la computadora (decisión 109).
export type Captura = keyof typeof MARCAS;
export const Captura = (p: { captura: Captura; alt: string; numero: string; pie: string; celular?: boolean; ancho?: number }) =>
  <Figura carpeta="entrar" marcas={MARCAS[p.captura]} {...p} />;

export const SECCIONES_DE_ENTRAR = [
  { id: "cual", nombre: "¿Cuál uso?" },
  { id: "compu-celular", nombre: "Con el celular", de: "compu" },
  { id: "compu-google", nombre: "Con Google", de: "compu" },
  { id: "compu-huella", nombre: "Con la huella", de: "compu" },
  { id: "celu-google", nombre: "Con Google", de: "celu" },
  { id: "celu-huella", nombre: "Con la huella", de: "celu" },
  { id: "problemas", nombre: "Si algo no funciona" },
] as const;

export const FORMAS: Record<Dispositivo, { id: string; nombre: string; detalle: string }[]> = {
  compu: [
    { id: "compu-celular", nombre: "Con el celular", detalle: "La más rápida. La computadora muestra un código y el celular lo lee." },
    { id: "compu-google", nombre: "Con Google", detalle: "Si no tenés el celular a mano." },
    { id: "compu-huella", nombre: "Con la huella", detalle: "Solo si la computadora tiene lector de huella." },
  ],
  celu: [
    { id: "celu-google", nombre: "Con Google", detalle: "La primera vez que usás Ferrebress en ese celular." },
    { id: "celu-huella", nombre: "Con la huella", detalle: "Todas las veces siguientes. Un toque y el dedo." },
  ],
};
