import { useEffect, useRef, type MutableRefObject } from "react";
import { saltar } from "../../../plataforma/animacion";
import { useEspejo } from "../../../espejo";
import { VERSION } from "../../../plataforma/ambiente";
import { useSesionPropia } from "../../../negocio/usuarios";
import { useVentaEnCurso } from "../../../negocio/ventas";
import { IndicadorDelVinculo } from "../../IndicadorDelVinculo";
import { Isotipo, Logotipo } from "../../Logotipo";
import { EstadoDeConexion, Icono } from "../base/ui";
import { irA } from "../base/rutas";
import { VincularParaEscanear } from "../ventas/VincularParaEscanear";
import { CuentaDelUsuario } from "./CuentaDelUsuario";
import { teclasDelMenu } from "./teclas-del-menu";
import type { MenuDeLaPersona } from "./useMenu";

// La cantidad de productos en la venta, en el menú: salta cuando suma, como la maqueta (decisión 134).
function CuentaDeLaVenta({ n }: { n: number }) {
  const ref = useRef<HTMLElement>(null);
  const antes = useRef(n);
  useEffect(() => { if (n > antes.current) saltar(ref.current); antes.current = n; }, [n]);
  return <b ref={ref} className="cuenta-menu" aria-label={`${n} en la venta`} data-testid="cuenta-venta">{n}</b>;
}

const conAlt = (tecla: string | null) => (tecla ? `Alt+${tecla}` : undefined);

type Props = { m: MenuDeLaPersona; plegado: boolean; plegar: () => void; porLaMarca: MutableRefObject<boolean> };

// El menú de la izquierda: la marca con el botón para achicarlo, las partes con su atajo y, abajo,
// el vínculo con el celular, la conexión y la cuenta.
export function Lateral({ m, plegado, plegar, porLaMarca }: Props) {
  // Cuántos renglones lleva la venta, en Vender del menú (015-E24).
  const enLaVenta = useVentaEnCurso().items.length;
  return (
    <aside className="lateral" onKeyDown={teclasDelMenu(porLaMarca)}>
      <div className="lateral-marca">
        <span className="marca-larga"><Logotipo sobre="claro" /></span>
        <span className="marca-corta"><Isotipo sobre="claro" lado={34} /></span>
        <button type="button" className="plegar" onClick={plegar} aria-label={plegado ? "Agrandar el menú" : "Achicar el menú"} title={`${plegado ? "Agrandar" : "Achicar"} el menú (Ctrl+B)`} aria-keyshortcuts="Control+B" aria-expanded={!plegado} data-testid="plegar-menu">
          <Icono nombre={plegado ? "agrandar-menu" : "achicar-menu"} tam={20} grosor={1.9} />
        </button>
      </div>
      <nav aria-label="Menú">{m.menu.map((p) => <BotonDeLaParte key={p.clave} p={p} m={m} plegado={plegado} enLaVenta={enLaVenta} />)}</nav>
      <PieDelMenu />
    </aside>
  );
}

function BotonDeLaParte({ p, m, plegado, enLaVenta }: { p: MenuDeLaPersona["menu"][number]; m: MenuDeLaPersona; plegado: boolean; enLaVenta: number }) {
  const destino = p.clave === "mas" ? "mas" : m.destinoDe(p.pestanas[0]!.ruta);
  const aca = m.parte === p.clave;
  const atajo = m.atajoDe(p.pestanas[0]!.ruta);
  const nombre = plegado ? p.nombre : undefined;
  return (
    <button type="button" aria-current={aca ? "page" : undefined} aria-keyshortcuts={conAlt(m.atajoDe(destino))} onClick={() => irA(destino)} data-testid={`menu-${p.clave}`} aria-label={nombre} title={nombre}>
      <Icono nombre={p.icono} tam={20} grosor={aca ? 2.3 : 1.9} /><span className="txt">{p.nombre}</span>
      {/* El número que, con Alt, abre la primera pantalla de esta parte. */}
      {atajo && <span className="atajo" aria-hidden="true">Alt+{atajo}</span>}
      {enLaVenta > 0 && p.pestanas.some((x) => x.ruta === "vender") && <CuentaDeLaVenta n={enLaVenta} />}
    </button>
  );
}

function PieDelMenu() {
  const { usuario, salir } = useSesionPropia();
  const { emparejado } = useEspejo();
  if (!usuario) return null;
  return (
    <div className="lateral-pie">
      <IndicadorDelVinculo />
      {!emparejado && <div className="lateral-vincular"><VincularParaEscanear vinculado={false} alVincular={() => undefined} /></div>}
      <EstadoDeConexion />
      <CuentaDelUsuario nombre={usuario.nombre} rol={usuario.roles?.join(", ") ?? ""} detalle={`${usuario.email} · versión ${VERSION}`} alSalir={salir} />
    </div>
  );
}
