import { crearAvisos } from "../comun/avisos.js";
import { escribir, type Confirmacion, type Dato, type Saludo } from "../comun/mensajes.js";

// La entrega confiable, sobre cualquier camino (ADR-027): cada dato llega una sola vez y en orden,
// aunque se cambie de camino, se corte o el otro recargue la página (E03, E18, E29).
//
// - Cada dato lleva su número. El que manda lo guarda hasta que el otro lo confirma.
// - El que recibe entrega en orden: lo adelantado espera, lo repetido se descarta y se vuelve a
//   confirmar.
// - Cada vez que se abre un camino, los dos se saludan (`saludar`) y se reenvía lo pendiente.
// - Cada página tiene su época: si el otro recargó, el saludo le dice desde qué número esperar.
// - Lo grande viaja en partes (E30), que se arman al llegar.
// - La demora es la de la última confirmación: no hay latidos para medirla.
export const TAMANO_DE_PARTE = 16_000;

export type OpcionesConfiables = {
  epoca: string;
  enviar: (texto: string) => void;
  ahora: () => number;
};

type Pendiente = { n: number; texto: string; enviadoEn: number; listo?: () => void };

export function crearConfiable({ epoca, enviar, ahora }: OpcionesConfiables) {
  const entregas = crearAvisos<string>();
  const demoras = crearAvisos<number>();
  const pendientes: Pendiente[] = [];
  let siguiente = 1;
  // Lo que se sabe del otro: su época, el próximo número que se espera, lo que llegó adelantado
  // y lo armado de un dato en partes.
  let otraEpoca = "";
  let esperado = 0;
  let adelantados = new Map<number, Dato>();
  let armado = "";

  const mandarPendiente = (p: Pendiente) => {
    p.enviadoEn = ahora();
    enviar(p.texto);
  };

  // Mandar un dato; la promesa se cumple cuando el otro confirma la última parte.
  function mandar(dato: string): Promise<void> {
    const partes = trocear(dato);
    return new Promise((listo) => {
      partes.forEach((d, i) => {
        const ultima = i === partes.length - 1;
        const p: Pendiente = { n: siguiente, texto: escribir({ t: "dato", e: epoca, n: siguiente++, d, s: !ultima }), enviadoEn: 0, listo: ultima ? listo : undefined };
        pendientes.push(p);
        mandarPendiente(p);
      });
    });
  }

  // Saludar al abrirse un camino, y reenviar lo pendiente por él.
  function saludar() {
    enviar(escribir({ t: "hola", e: epoca, desde: pendientes[0]?.n ?? siguiente, re: otraEpoca, rh: esperado - 1 }));
    pendientes.forEach(mandarPendiente);
  }

  // El otro confirmó hasta `h`: se sueltan esos pendientes y se mide la demora.
  function confirmar(h: number) {
    while (pendientes.length && pendientes[0]!.n <= h) {
      const p = pendientes.shift()!;
      demoras.avisar(ahora() - p.enviadoEn);
      p.listo?.();
    }
  }

  function alSaludo(m: Saludo) {
    if (m.e !== otraEpoca) {
      otraEpoca = m.e;
      esperado = m.desde;
      adelantados = new Map();
      armado = "";
    }
    if (m.re === epoca) confirmar(m.rh);
  }

  function alDato(m: Dato) {
    if (m.e !== otraEpoca) return;
    if (m.n >= esperado) adelantados.set(m.n, m);
    for (let d = adelantados.get(esperado); d; d = adelantados.get(esperado)) {
      adelantados.delete(esperado++);
      armado += d.d;
      if (!d.s) {
        entregas.avisar(armado);
        armado = "";
      }
    }
    enviar(escribir({ t: "ok", e: otraEpoca, h: esperado - 1 }));
  }

  function alConfirmacion(m: Confirmacion) {
    if (m.e === epoca) confirmar(m.h);
  }

  return { entregas, demoras, mandar, saludar, alSaludo, alDato, alConfirmacion };
}

export type Confiable = ReturnType<typeof crearConfiable>;

// Parte un texto en pedazos de hasta TAMANO_DE_PARTE (un texto vacío es una parte vacía).
function trocear(texto: string): string[] {
  const partes = [texto.slice(0, TAMANO_DE_PARTE)];
  for (let i = TAMANO_DE_PARTE; i < texto.length; i += TAMANO_DE_PARTE) partes.push(texto.slice(i, i + TAMANO_DE_PARTE));
  return partes;
}
