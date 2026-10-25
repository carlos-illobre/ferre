import { useRef } from "react";
import { useComandos, useEtiqueta } from "../../../plataforma/comandos";
import { LUGAR_AL_LADO_DE_LAS_PESTANAS } from "../../AlLadoDeLasPestanas";
import { Atajo, Icono } from "../base/ui";
import { irA } from "../base/rutas";
import { NOMBRES, SIN_ATAJO, type Pestana } from "./menu";
import type { MenuDeLaPersona } from "./useMenu";

// El título de la parte, grande, con la acción de la pantalla a la derecha (como la v2: pedido de
// Carlos del 2026-10-15, decisión 148) y, debajo, sus pestañas.
// Ofrece llevar el foco a la pestaña de la pantalla (desde arriba de su lista, decisión 82).
export function CabezaDeLaParte({ m, actual }: { m: MenuDeLaPersona; actual: string }) {
  const pestanas = useRef<HTMLElement>(null);
  useComandos({ "pestanas.enfocar": () => { const aca = pestanas.current?.querySelector<HTMLElement>("button[aria-current='page']"); if (!aca) return false; aca.focus(); } });
  return (
    <div className="pestanas-fila">
      {m.titulo && <div className="parte-cabeza"><h1 className="parte-titulo" data-testid="titulo-de-la-parte">{m.titulo}</h1>
        <div className="pestanas-acciones" id={LUGAR_AL_LADO_DE_LAS_PESTANAS} /></div>}
      {m.pestanas && <nav ref={pestanas} className="pestanas" data-zona="pestanas" aria-label={NOMBRES.get(actual)}>
        {m.pestanas.map((p) => <PestanaDeLaParte key={p.ruta} p={p} m={m} />)}
      </nav>}
      {!m.titulo && <div className="pestanas-acciones" id={LUGAR_AL_LADO_DE_LAS_PESTANAS} />}
    </div>
  );
}

function PestanaDeLaParte({ p, m }: { p: Pestana; m: MenuDeLaPersona }) {
  const aca = m.deLaPestana === p.ruta;
  const accion = SIN_ATAJO.has(p.ruta) ? null : m.accionDe(p.ruta);
  const tecla = useEtiqueta(accion ?? "");
  return (
    <button type="button" aria-current={aca ? "page" : undefined} aria-keyshortcuts={tecla} data-pestana={p.ruta} data-testid={`pestana-${p.ruta}`}
      onClick={() => irA(m.destinoDe(p.ruta))}>
      <Icono nombre={p.icono} tam={20} grosor={aca ? 2.3 : 2} />{p.nombre}{p.ruta === "para-revisar" && <CuantosParaRevisar n={m.paraRevisar} />}{accion && <Atajo accion={accion} />}
    </button>
  );
}

// Lo que hay para revisar, en su pestaña (014).
function CuantosParaRevisar({ n }: { n: number }) {
  return n > 0 ? <span className="cuenta-pestana" data-testid="cuenta-para-revisar" aria-label={`${n} para revisar`}>{n}</span> : null;
}
