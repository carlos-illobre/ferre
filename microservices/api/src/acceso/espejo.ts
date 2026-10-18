// El espejo (decisión 60): emparejados y con la aplicación abierta en los dos, el celular y la
// computadora están en la misma parte y comparten el trabajo en curso. Cada lado avisa lo que
// cambia y acá se le pasa al otro; se guarda además lo último, para que el que llega después lo
// tome. Cada emparejamiento tiene su propio espejo. Vive en memoria (un solo proceso, ADR-001):
// se pierde si el servidor se reinicia. También en memoria: los códigos escaneados que esperan
// la computadora y los pedidos de que el celular haga de lector (decisión 59).
export type Lado = "computadora" | "celular";
type Oyente = (evento: string, datos: unknown) => void;
type Espejo = { parte: string | null; docs: Record<string, unknown>; pausado: boolean; oyentes: Record<Lado, Set<Oyente>> };

// Los trabajos en curso que se comparten. El servidor no los entiende: los guarda y los pasa.
const DOCUMENTOS = ["venta", "ingreso", "pedido", "pedido-renglones"];
const MAXIMO_DE_DOCUMENTO = 200_000; // caracteres de un trabajo en curso serializado
const LADOS: Lado[] = ["computadora", "celular"];
const espejos = new Map<string, Espejo>();

function espejoDe(puestoId: string): Espejo {
  let e = espejos.get(puestoId);
  if (!e) { e = { parte: null, docs: {}, pausado: false, oyentes: { computadora: new Set(), celular: new Set() } }; espejos.set(puestoId, e); }
  return e;
}
const presentes = (e: Espejo) => ({ computadora: e.oyentes.computadora.size > 0, celular: e.oyentes.celular.size > 0 });
const otro = (lado: Lado): Lado => (lado === "computadora" ? "celular" : "computadora");

// Un lado avisa un cambio: a qué parte fue, cómo quedó un trabajo en curso, que pausó, o un
// aviso de algo que terminó («venta cobrada»), que se pasa y no se guarda.
export function cambio(puestoId: string, lado: Lado, tipo: string | undefined, datos: unknown): null | { error: string; estado: 400 | 413 } {
  const e = espejoDe(puestoId);
  if (tipo === "ir") e.parte = String(datos ?? "").slice(0, 120) || null;
  else if (tipo && DOCUMENTOS.includes(tipo)) { if (JSON.stringify(datos ?? null).length > MAXIMO_DE_DOCUMENTO) return { error: "Es demasiado grande para compartirlo", estado: 413 }; e.docs[tipo] = datos ?? null; }
  else if (tipo === "pausa") e.pausado = Boolean(datos);
  else if (tipo === "aviso") { if (String(datos ?? "").length > 300) return { error: "El aviso es demasiado largo", estado: 413 }; }
  else return { error: "No se entiende el cambio", estado: 400 };
  // La pausa les llega a los dos; lo demás, al otro.
  for (const l of tipo === "pausa" ? LADOS : [otro(lado)]) e.oyentes[l].forEach((o) => o(tipo, tipo === "pausa" ? e.pausado : datos));
  return null;
}

// Un lado se pone a escuchar: recibe cómo está todo y los dos se enteran de quién está.
// Devuelve el estado, cómo avisar la presencia (después de mandarle el estado) y cómo dejar de escuchar.
export function escuchar(puestoId: string, lado: Lado, oyente: Oyente): { estado: unknown; avisarPresencia: () => void; dejar: () => void } {
  const e = espejoDe(puestoId);
  const avisarPresencia = () => { const p = presentes(e); for (const l of LADOS) e.oyentes[l].forEach((o) => o("presencia", p)); };
  e.oyentes[lado].add(oyente);
  const estado = { lado, parte: e.parte, docs: e.docs, pausado: e.pausado, presentes: presentes(e) };
  return { estado, avisarPresencia, dejar: () => { e.oyentes[lado].delete(oyente); avisarPresencia(); } };
}

// Se soltó el emparejamiento: a los dos se les avisa, para que dejen el espejo en el momento.
export function cerrar(puestoId: string) {
  const e = espejos.get(puestoId);
  if (!e) return;
  for (const l of LADOS) e.oyentes[l].forEach((o) => o("desvinculado", null));
  espejos.delete(puestoId);
}

// La computadora le pidió algo al celular (que haga de lector, una foto): se le avisa en el
// momento por su espejo, y el celular pregunta qué es (decisión 112). Si no está escuchando, lo
// ve la próxima vez que pregunte.
export function avisarPedidoAlCelular(puestoId: string) { espejos.get(puestoId)?.oyentes.celular.forEach((o) => o("pedidos", null)); }

// ---------- Códigos escaneados hacia la computadora ----------
export type Codigo = { id: string; codigo: string; creado_en: string };
const oyentesDeCodigos = new Map<string, Set<(c: Codigo) => void>>();
export function avisarCodigo(puestoId: string, c: Codigo) { oyentesDeCodigos.get(puestoId)?.forEach((o) => o(c)); }
export function escucharCodigos(puestoId: string, oyente: (c: Codigo) => void): () => void {
  if (!oyentesDeCodigos.has(puestoId)) oyentesDeCodigos.set(puestoId, new Set());
  oyentesDeCodigos.get(puestoId)!.add(oyente);
  return () => oyentesDeCodigos.get(puestoId)?.delete(oyente);
}

// ---------- Que el celular haga de lector (decisión 59) ----------
// El pedido vive dos minutos.
const SEGUNDOS_PEDIDO_DE_LECTOR = 120;
const lectoresPedidos = new Map<string, number>(); // sesión de la computadora → hasta cuándo vale
export const pedirLector = (compuSesionId: string) => lectoresPedidos.set(compuSesionId, Date.now() + SEGUNDOS_PEDIDO_DE_LECTOR * 1000);
export const esperanLector = (computadoras: string[]) => { const ahora = Date.now(); return computadoras.some((s) => (lectoresPedidos.get(s) ?? 0) > ahora); };
export const lectorAtendido = (computadoras: string[]) => { for (const s of computadoras) lectoresPedidos.delete(s); };
