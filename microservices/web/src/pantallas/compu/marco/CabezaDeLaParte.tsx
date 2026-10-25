import type { MutableRefObject } from "react";
import { LUGAR_AL_LADO_DE_LAS_PESTANAS } from "../../AlLadoDeLasPestanas";
import { Icono } from "../base/ui";
import { irA } from "../base/rutas";
import { NOMBRES, SIN_ATAJO, type Pestana } from "./menu";
import { dejarElFocoEn, teclasDeLasPestanas } from "./teclas-del-menu";
import type { MenuDeLaPersona } from "./useMenu";

// El título de la parte, grande, con la acción de la pantalla a la derecha (como la v2: pedido de
// Carlos del 2026-10-15, decisión 148) y, debajo, sus pestañas.
export function CabezaDeLaParte({ m, actual, porLaMarca }: { m: MenuDeLaPersona; actual: string; porLaMarca: MutableRefObject<boolean> }) {
  return (
    <div className="pestanas-fila">
      {m.titulo && <div className="parte-cabeza"><h1 className="parte-titulo" data-testid="titulo-de-la-parte">{m.titulo}</h1>
        <div className="pestanas-acciones" id={LUGAR_AL_LADO_DE_LAS_PESTANAS} /></div>}
      {m.pestanas && <nav className="pestanas" aria-label={NOMBRES.get(actual)} onKeyDown={teclasDeLasPestanas}>
        {m.pestanas.map((p) => <PestanaDeLaParte key={p.ruta} p={p} m={m} porLaMarca={porLaMarca} />)}
      </nav>}
      {!m.titulo && <div className="pestanas-acciones" id={LUGAR_AL_LADO_DE_LAS_PESTANAS} />}
    </div>
  );
}

// Al abrirla (con un clic o con Enter), la marca de las flechas queda en esta pestaña: la pantalla
// nueva no se la lleva.
function PestanaDeLaParte({ p, m, porLaMarca }: { p: Pestana; m: MenuDeLaPersona; porLaMarca: MutableRefObject<boolean> }) {
  const aca = m.deLaPestana === p.ruta;
  const atajo = SIN_ATAJO.has(p.ruta) ? null : m.atajoDe(p.ruta);
  return (
    <button type="button" aria-current={aca ? "page" : undefined} aria-keyshortcuts={atajo ? `Alt+${atajo}` : undefined} data-testid={`pestana-${p.ruta}`}
      onClick={() => { irA(m.destinoDe(p.ruta)); dejarElFocoEn(porLaMarca, () => document.querySelector<HTMLButtonElement>(`[data-testid="pestana-${p.ruta}"]`)); }}>
      <Icono nombre={p.icono} tam={20} grosor={aca ? 2.3 : 2} />{p.nombre}{p.ruta === "para-revisar" && <CuantosParaRevisar n={m.paraRevisar} />}{atajo && <span className="tecla" aria-hidden="true">Alt+{atajo}</span>}
    </button>
  );
}

// Lo que hay para revisar, en su pestaña (014).
function CuantosParaRevisar({ n }: { n: number }) {
  return n > 0 ? <span className="cuenta-pestana" data-testid="cuenta-para-revisar" aria-label={`${n} para revisar`}>{n}</span> : null;
}
