import { crearAvisos } from "../comun/avisos.js";
import { leerACuestas, type ACuestas, type EventoDelCanal, type PedidoDeTema } from "../comun/temas.js";
import { crearCanal, type EstadoDelCanal, type RechazoDelCanal } from "./canal.js";
import { redDe, vistaDe, type Red, type Vista } from "./entorno.js";
import { esperarReal, type Esperar } from "./reloj.js";

// La central de avisos del dispositivo (ADR-030): lo único que necesita quien quiere enterarse de
// algo que pasa del otro lado. Se le declara una espera (un tema y qué hacer cuando llega) y ella
// se ocupa de cómo enterarse:
//   - temporaria: abre el canal mientras dure (el código QR en pantalla), en tiempo real;
//   - permanente: nunca abre el canal; se entera con lo que viaja a cuestas en las respuestas, o
//     por el canal si ya está abierto por otra cosa (la versión nueva). Solo avisa si el valor
//     cambia: el primero que ve queda de referencia.
// También cuenta lo que pasa con la conexión (los sucesos), para los indicadores.

export type EstadoDelTema = { conectado: boolean; otro: boolean };
export type Espera = {
  tema: string;
  temporaria?: boolean;
  // Se sabe solo por lo que va a cuestas (la versión): no se pide como tema del canal, porque el
  // servidor lo cuenta al abrirlo igual.
  aCuestas?: boolean;
  // De qué lado está, si el tema tiene lados (el vínculo), y su secreto, si lo pide.
  lado?: string;
  clave?: string;
  // Llegó un aviso del tema.
  alAviso?: (datos: unknown) => void;
  // Si el canal está abierto con el tema, y si hay alguien de otro lado (solo con lado).
  alEstado?: (estado: EstadoDelTema) => void;
  // El tema se cerró del otro lado, o el servidor no lo dio: la espera ya no sigue.
  alCerrar?: () => void;
  alRechazo?: (estado: number) => void;
};
export type Suceso = "contesto" | "fallo" | "abriendo" | "abierto" | "cortado" | "sin-red" | "con-red";

export type OpcionesDeLaCentral = {
  // Dónde se abre el canal y con qué cabeceras (la sesión).
  url: string;
  cabeceras?: () => Record<string, string>;
  // Lo que se toma del navegador; se reemplaza en las pruebas.
  entorno?: Partial<{ fetch: typeof fetch; esperar: Esperar; vista: Vista; red: Red }>;
};

const nada = () => {};
type Completa = Required<Omit<Espera, "lado" | "clave">> & Pick<Espera, "lado" | "clave">;
const completar = (e: Espera): Completa => ({ temporaria: false, aCuestas: false, alAviso: nada, alEstado: nada, alCerrar: nada, alRechazo: nada, ...e });
const pedidoDe = (e: Completa): PedidoDeTema => ({ t: e.tema, ...(e.lado && { l: e.lado }), ...(e.clave && { k: e.clave }) });
const SUCESO_DEL_CANAL: Partial<Record<EstadoDelCanal, Suceso>> = { abriendo: "abriendo", abierto: "abierto", cortado: "cortado" };

export function crearCentral(o: OpcionesDeLaCentral) {
  const entorno = {
    fetch: ((...a) => fetch(...a)) as typeof fetch,
    esperar: esperarReal,
    vista: vistaDe(globalThis.document),
    red: redDe(globalThis.window),
    ...o.entorno,
  };
  const cabeceras = o.cabeceras ?? (() => ({}));
  const canal = crearCanal({ url: o.url, cabeceras, fetch: entorno.fetch, esperar: entorno.esperar, vista: entorno.vista });
  const sucesos = crearAvisos<Suceso>();
  const esperas = new Set<Completa>();
  const vistos = new Map<string, string>();
  const del = (tema: string) => [...esperas].filter((e) => e.tema === tema);

  // Los temas permanentes que el servidor no da: la espera sigue (le llega a cuestas), pero no
  // se vuelven a pedir en el canal.
  const fueraDelCanal = new Set<string>();
  // El canal escucha todos los temas (así lo permanente viaja gratis), pero solo si hay alguna
  // espera temporaria. Si la lista no cambia, el canal no se toca.
  function pedir() {
    const todas = [...esperas];
    const enElCanal = todas.filter((e) => !e.aCuestas && !fueraDelCanal.has(e.tema));
    const temas = new Map(enElCanal.map((e) => [e.tema, pedidoDe(e)]));
    canal.poner(todas.some((e) => e.temporaria) ? [...temas.values()] : []);
  }
  function sacar(tema: string, avisar: (e: Completa) => void) {
    del(tema).forEach((e) => { esperas.delete(e); avisar(e); });
    pedir();
  }

  // Lo permanente: se avisa solo cuando el valor de un tema cambia.
  function aCuestas(valores: ACuestas) {
    for (const [tema, valor] of Object.entries(valores)) {
      const texto = JSON.stringify(valor);
      const antes = vistos.get(tema);
      vistos.set(tema, texto);
      if (antes !== undefined && antes !== texto) del(tema).forEach((e) => e.alAviso(valor));
    }
  }

  // Lo que llega por el canal: lo que va a cuestas, un aviso, la presencia o que el tema se cerró.
  function atender(e: EventoDelCanal) {
    if ("a" in e) return aCuestas(e.a);
    if ("d" in e) return del(e.t).forEach((x) => x.alAviso(e.d));
    if ("p" in e) return del(e.t).forEach((x) => x.alEstado({ conectado: true, otro: e.p }));
    sacar(e.t, (x) => x.alCerrar());
  }
  function alCanal(estado: EstadoDelCanal) {
    const suceso = SUCESO_DEL_CANAL[estado];
    if (suceso) sucesos.avisar(suceso);
    if (estado === "cortado" || estado === "cerrado") esperas.forEach((x) => x.alEstado({ conectado: false, otro: false }));
  }
  // El servidor no dio unos temas: la espera temporaria termina; la permanente sigue, fuera del canal.
  function alRechazo(r: RechazoDelCanal) {
    for (const e of [...esperas].filter((x) => r.temas.includes(x.tema))) {
      if (e.temporaria) esperas.delete(e);
      else fueraDelCanal.add(e.tema);
      e.alRechazo(r.estado);
    }
    pedir();
  }

  canal.eventos.escuchar(atender);
  canal.estado.escuchar(alCanal);
  canal.rechazos.escuchar(alRechazo);
  entorno.red.alCambiar((enLinea) => sucesos.avisar(enLinea ? "con-red" : "sin-red"));

  return {
    // Declarar una espera; devuelve cómo dejarla.
    vigilar(espera: Espera): () => void {
      const e = completar(espera);
      esperas.add(e);
      pedir();
      return () => { if (esperas.delete(e)) pedir(); };
    },
    // Llegó una respuesta del servidor, con su cabecera de lo que va a cuestas (o sin ella).
    respondio(cabecera: string | null) {
      sucesos.avisar("contesto");
      const valores = leerACuestas(cabecera);
      if (valores) aCuestas(valores);
    },
    // Un pedido no llegó al servidor (falta de red).
    fallo: () => sucesos.avisar("fallo"),
    // Cortar y volver a abrir el canal (si está abierto).
    reconectar: () => canal.reconectar(),
    // Lo que pasa con la conexión, para los indicadores.
    sucesos,
    // Mandar algo al servidor (JSON, con las mismas cabeceras que el canal): lo usa el enlace.
    mandar: (url: string, cuerpo: string) => entorno.fetch(url, { method: "POST", headers: { ...cabeceras(), "Content-Type": "application/json" }, body: cuerpo }),
  };
}

export type Central = ReturnType<typeof crearCentral>;
