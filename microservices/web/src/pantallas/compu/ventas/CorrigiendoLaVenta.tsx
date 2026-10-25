import { useEffect, useState } from "react";
import { pesosCortos } from "../../../negocio/formato";
import { useCorrigiendo, type Correccion, type VentaDelDia } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";
import { signo } from "../../comun/ventas/textos-del-dia";
import { Atajo, Aviso, Boton, Icono, Pastilla } from "../base/ui";
import { useEtiqueta } from "../../../plataforma/comandos";
import { AgregarProducto } from "./AgregarProducto";
import { ComoSeResuelve } from "./ComoSeResuelve";
import { ElegirCliente } from "./ElegirCliente";
import { MedioYCliente } from "./MedioYCliente";
import { RenglonCorregido, RenglonQuitado } from "./RenglonCorregido";
import { useGuardarCorreccion } from "./useGuardarCorreccion";
import type { ListaDelDia } from "./useListaDelDia";
import css from "./VentasDelDia.module.css";

// Corrigiendo la venta en su panel: cada renglón con − + y su precio, el tacho, agregar un
// producto, el medio y el cliente; lo anterior tachado, la diferencia y cómo se resuelve.
const t = TEXTOS.hoy;

export function CorrigiendoLaVenta({ venta: v, c, l }: { venta: VentaDelDia; c: Correccion; l: ListaDelDia }) {
  const k = useCorrigiendo(v, c, l.cambiar);
  const g = useGuardarCorreccion(v, c, k, (m) => { l.descartar(); l.setMensaje(m); });
  const [eligiendoCliente, setEligiendoCliente] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const { setHojaAbierta } = l;
  useEffect(() => { setHojaAbierta(eligiendoCliente); }, [eligiendoCliente, setHojaAbierta]);
  l.guardarRef.current = () => { void g.guardar(); };
  const teclas = { descartar: useEtiqueta("hoy.descartar"), guardar: useEtiqueta("hoy.guardar") };
  return (
    <div className="corregir" data-testid="corrigiendo">
      <ul className="renglones">
        {c.renglones.map((r, i) => <RenglonCorregido key={r.id ?? `n${i}`} r={r} alCambiar={(x) => k.cambiarRenglon(i, x)} alQuitar={() => k.quitarRenglon(i)} />)}
        {c.quitados.map((r) => <RenglonQuitado key={`q${r.id}`} r={r} alVolver={() => k.volverAPoner(r)} />)}
      </ul>
      {agregando ? <AgregarProducto alAgregar={(r) => { k.agregar(r); setAgregando(false); }} alCerrar={() => setAgregando(false)} />
        : <button type="button" className={css.agregar} onClick={() => setAgregando(true)} data-testid="agregar-producto"><Icono nombre="mas" tam={16} />{t.agregarProducto.largo}</button>}
      <MedioYCliente venta={v} c={c} k={k} alCambiar={l.cambiar} alElegirCliente={() => setEligiendoCliente(true)} />
      <TotalCorregido total={k.total} antes={Number(v.total)} diferencia={k.diferencia} />
      <ComoSeResuelve k={k} />
      <Aviso tipo="error">{g.error}</Aviso>
      <div className="acciones">
        <Boton className={css.fantasma} onClick={l.descartar} aria-keyshortcuts={teclas.descartar} title={teclas.descartar} data-testid="descartar">{t.descartar.largo}</Boton>
        <Boton variante="principal" disabled={g.guardando} aria-disabled={Boolean(k.falta)} className={k.falta ? "apagado" : ""} onClick={() => void g.guardar()} aria-keyshortcuts={teclas.guardar} data-testid="guardar-correccion">
          {g.guardando ? "Guardando…" : <>{t.guardarCorreccion.corto}{k.diferencia ? ` · ${signo(k.diferencia)}` : ""} <Atajo accion="hoy.guardar" kbd /></>}
        </Boton>
      </div>
      {eligiendoCliente && <ElegirCliente clientes={k.clientes} elegido={c.clienteId ?? ""} alCerrar={() => setEligiendoCliente(false)} alElegir={(id) => { k.elegirCliente(id); setEligiendoCliente(false); }} />}
    </div>
  );
}

function TotalCorregido({ total, antes, diferencia }: { total: number; antes: number; diferencia: number }) {
  return (
    <div className="tot">
      <span>{t.columnaTotal.largo}</span>
      <span className="nuevo">
        {diferencia !== 0 && <s className="viejo">{pesosCortos(antes)}</s>}
        <b className="importe" data-testid="total-corregido">{pesosCortos(total)}</b>
        {diferencia !== 0 && <Pastilla tipo="alerta" sinPunto><span data-testid="diferencia">{signo(diferencia)}</span></Pastilla>}
      </span>
    </div>
  );
}
