import type { Dispositivo } from "./piezas";
import { CAPITULOS, NOMBRE_DEL_DISPOSITIVO, escritoPara, type Capitulo, type Seccion } from "./capitulos";
import { irAlInicio } from "./Indice";

export type CapituloEscrito = { c: Capitulo; i: number };
type Lectura = { dispositivo: Dispositivo; numero: number; secciones: Seccion[]; actual: string; escritos: CapituloEscrito[]; abrirCapitulo: (i: number) => void };

function Migas({ x }: { x: Lectura }) {
  return (
    <nav className="manual-migas" aria-label="Estás en" data-testid="manual-migas">
      <button type="button" onClick={irAlInicio}>Manual de uso</button><span aria-hidden="true">›</span>
      <span className="manual-migas-dispositivo">{NOMBRE_DEL_DISPOSITIVO[x.dispositivo]}</span><span aria-hidden="true">›</span>
      <button type="button" onClick={irAlInicio}>{x.numero + 1}. {CAPITULOS[x.numero]!.nombre}</button><span aria-hidden="true">›</span>
      <b>{x.secciones.find((s) => s.id === x.actual)?.nombre ?? ""}</b>
    </nav>
  );
}

function Siguiente({ x }: { x: Lectura }) {
  const siguiente = CAPITULOS[x.numero + 1];
  if (!siguiente) return null;
  return escritoPara(siguiente, x.dispositivo)
    ? <button type="button" onClick={() => x.abrirCapitulo(x.numero + 1)}>Siguiente: {siguiente.nombre} →</button>
    : <span>Siguiente: {siguiente.nombre} (pronto) →</span>;
}

function Pie({ x }: { x: Lectura }) {
  const anterior = x.escritos[x.escritos.findIndex(({ i }) => i === x.numero) - 1];
  return (
    <nav className="manual-pie">
      {anterior ? <button type="button" onClick={() => x.abrirCapitulo(anterior.i)}>← Anterior: {anterior.c.nombre}</button> : <span>Este es el primer capítulo</span>}
      <Siguiente x={x} />
    </nav>
  );
}

// La hoja que se lee: dónde se está, el capítulo abierto y cómo seguir.
export function Lectura({ x }: { x: Lectura }) {
  return (
    <main className="manual-hoja" id="contenido" tabIndex={-1}>
      <Migas x={x} />
      {/* Todos los capítulos escritos para el dispositivo están en la página, para que el buscador
          los encuentre; se ve solo el abierto. */}
      {x.escritos.map(({ c, i }) => (
        <article key={`${c.nombre}-${x.dispositivo}`} hidden={i !== x.numero} data-testid={c.testId} data-capitulo={i} data-nombre={c.nombre}>
          {c.escrito![x.dispositivo]!.contenido()}
        </article>
      ))}
      <Pie x={x} />
    </main>
  );
}
