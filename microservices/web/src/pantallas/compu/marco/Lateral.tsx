import { useEffect, useRef } from "react";
import { useEtiqueta } from "../../../plataforma/comandos";
import { saltar } from "../../../plataforma/animacion";
import { useEspejo } from "../../../negocio/espejo";
import { VERSION } from "../../../plataforma/ambiente";
import { useSesionPropia } from "../../../negocio/usuarios";
import { useVentaEnCurso } from "../../../negocio/ventas";
import { IndicadorDelVinculo } from "../../IndicadorDelVinculo";
import { Isotipo, Logotipo } from "../../Logotipo";
import { Atajo, EstadoDeConexion, Icono } from "../base/ui";
import { irA } from "../base/rutas";
import { VincularParaEscanear } from "../ventas/VincularParaEscanear";
import { CuentaDelUsuario } from "./CuentaDelUsuario";
import type { MenuDeLaPersona } from "./useMenu";

// La cantidad de productos en la venta, en el menú: salta cuando suma, como la maqueta (decisión 134).
function CuentaDeLaVenta({ n }: { n: number }) {
  const ref = useRef<HTMLElement>(null);
  const antes = useRef(n);
  // Al aparecer (el primer producto) no salta: salta cuando suma a lo que ya había.
  useEffect(() => { if (n > antes.current && antes.current > 0) saltar(ref.current); antes.current = n; }, [n]);
  if (n === 0) return null;
  return <b ref={ref} className="cuenta-menu" aria-label={`${n} en la venta`} data-testid="cuenta-venta">{n}</b>;
}


type Props = { m: MenuDeLaPersona; plegado: boolean; plegar: () => void };

// El menú de la izquierda: la marca con el botón para achicarlo, las partes con su atajo y, abajo,
// el vínculo con el celular, la conexión y la cuenta.
export function Lateral({ m, plegado, plegar }: Props) {
  // Cuántos renglones lleva la venta, en Vender del menú (015-E24).
  const enLaVenta = useVentaEnCurso().items.length;
  return (
    <aside className="lateral" data-zona="menu">
      <div className="lateral-marca">
        <span className="marca-larga"><Logotipo sobre="claro" /></span>
        <span className="marca-corta"><Isotipo sobre="claro" lado={34} /></span>
        <BotonDePlegar plegado={plegado} plegar={plegar} />
      </div>
      <nav aria-label="Menú">{m.menu.map((p) => <BotonDeLaParte key={p.clave} p={p} m={m} plegado={plegado} enLaVenta={enLaVenta} />)}</nav>
      <PieDelMenu />
    </aside>
  );
}

// Achicar el menú a solo íconos y volver a agrandarlo (decisión 122).
function BotonDePlegar({ plegado, plegar }: { plegado: boolean; plegar: () => void }) {
  const tecla = useEtiqueta("menu.plegar");
  return (
    <button type="button" className="plegar" onClick={plegar} aria-label={plegado ? "Agrandar el menú" : "Achicar el menú"} title={`${plegado ? "Agrandar" : "Achicar"} el menú${tecla ? ` (${tecla})` : ""}`} aria-keyshortcuts={tecla} aria-expanded={!plegado} data-testid="plegar-menu">
      <Icono nombre={plegado ? "agrandar-menu" : "achicar-menu"} tam={20} grosor={1.9} />
    </button>
  );
}

function BotonDeLaParte({ p, m, plegado, enLaVenta }: { p: MenuDeLaPersona["menu"][number]; m: MenuDeLaPersona; plegado: boolean; enLaVenta: number }) {
  const destino = p.clave === "mas" ? "mas" : m.destinoDe(p.pestanas[0]!.ruta);
  const aca = m.parte === p.clave;
  const tecla = useEtiqueta(m.accionDe(destino) ?? "");
  const nombre = plegado ? p.nombre : undefined;
  return (
    <button type="button" aria-current={aca ? "page" : undefined} aria-keyshortcuts={tecla} onClick={() => irA(destino)} data-testid={`menu-${p.clave}`} aria-label={nombre} title={nombre}>
      <Icono nombre={p.icono} tam={20} grosor={aca ? 2.3 : 1.9} /><span className="txt">{p.nombre}</span>
      {/* La tecla que abre la primera pantalla de esta parte. */}
      <Atajo accion={m.accionDe(p.pestanas[0]!.ruta) ?? ""} className="atajo" />
      {p.pestanas.some((x) => x.ruta === "vender") && <CuentaDeLaVenta n={enLaVenta} />}
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
