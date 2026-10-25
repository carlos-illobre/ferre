import { irASeccion, type Dispositivo } from "./piezas";
import { CAPITULOS, escritoPara, type Capitulo, type Seccion } from "./capitulos";
import { SelectorDeDispositivo } from "./SelectorDeDispositivo";

export const irAlInicio = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById("contenido")?.focus({ preventScroll: true });
};

function SeccionesDelCapitulo({ secciones, actual }: { secciones: Seccion[]; actual: string }) {
  return (
    <ul className="manual-secciones">{secciones.map((x) => (
      <li key={x.id} className={x.id === actual ? "actual" : undefined}>
        <button type="button" onClick={() => irASeccion(x.id)} aria-current={x.id === actual ? "location" : undefined}>{x.nombre}</button>
      </li>
    ))}</ul>
  );
}

type Indice = { dispositivo: Dispositivo; numero: number; secciones: Seccion[]; actual: string; abrirCapitulo: (i: number) => void };

function CapituloDelIndice({ c, i, x }: { c: Capitulo; i: number; x: Indice }) {
  const escrito = escritoPara(c, x.dispositivo);
  const abierto = i === x.numero;
  return (
    <li className={abierto ? "actual" : escrito ? "escrito" : "pronto"} data-testid="manual-capitulo">
      {escrito
        ? <button type="button" onClick={() => (abierto ? irAlInicio() : x.abrirCapitulo(i))} aria-current={abierto ? "page" : undefined}><b>{i + 1}</b>{c.nombre}</button>
        : <span aria-disabled="true"><b>{i + 1}</b>{c.nombre}<em>pronto</em></span>}
      {abierto && <SeccionesDelCapitulo secciones={x.secciones} actual={x.actual} />}
    </li>
  );
}

// El índice: dónde se usa, los capítulos y, del abierto, sus secciones.
export function IndiceDelManual({ x, alElegirDispositivo }: { x: Indice; alElegirDispositivo: (d: Dispositivo) => void }) {
  return (
    <nav className="manual-indice" aria-label="Capítulos">
      <SelectorDeDispositivo valor={x.dispositivo} alElegir={alElegirDispositivo} />
      <h2>Capítulos</h2>
      <ol>{CAPITULOS.map((c, i) => <CapituloDelIndice key={c.nombre} c={c} i={i} x={x} />)}</ol>
    </nav>
  );
}
