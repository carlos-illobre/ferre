import { useEffect, useState } from "react";
import { aEntrada, fueSinConexion, MEDIOS, useCorregirVenta, useCorrigiendo, type Correccion, type Corrigiendo, type VentaDelDia } from "../../../negocio/ventas";
import { pedirClientes } from "../../../negocio/catalogo";
import { pesosCortos } from "../../../formato";
import { TEXTOS } from "../../textos";
import { signo } from "../../comun/ventas/textos-del-dia";
import { AvisoError, Hoja, Icono } from "../componentes/base";
import { BotonDeCliente } from "./BotonDeCliente";
import { ComoSeResuelve } from "./ComoSeResuelve";
import { ElegirCliente } from "./ElegirCliente";
import { MediosDePago } from "./MediosDePago";
import { RenglonCorregido, RenglonQuitado } from "./RenglonCorregido";
import { SumarProducto } from "./SumarProducto";
import css from "./VentasDelDia.module.css";

// Corregir, dentro de la hoja de la venta (specs/019, decisiones 124 y 135), como la v2: la venta
// editada, con lo de antes tachado, el medio, el total y cómo se resuelve la diferencia.
const t = TEXTOS.hoy;
type Props = { venta: VentaDelDia; c: Correccion; alCambiar: (c: Correccion) => void; alGuardar: (mensaje: string) => void; alDescartar: () => void };

export function CorregirEnLaHoja({ venta: v, c, alCambiar, alGuardar, alDescartar }: Props) {
  const k = useCorrigiendo(v, c, alCambiar);
  const g = useGuardar(v, c, k, alGuardar);
  const [eligiendoCliente, setEligiendoCliente] = useState(false);
  const [sumando, setSumando] = useState(false);
  useEffect(() => { pedirClientes(); }, []);
  return (
    <div className={css.corregir} data-testid="corrigiendo">
      {c.renglones.map((r, i) => <RenglonCorregido key={r.id ?? `n${i}`} r={r} alCambiar={(x) => k.cambiarRenglon(i, x)} alQuitar={() => k.quitarRenglon(i)} />)}
      {c.quitados.map((r) => <RenglonQuitado key={`q${r.id}`} r={r} alVolver={() => k.volverAPoner(r)} />)}
      {sumando ? <SumarProducto etiqueta={t.agregarProducto.corto} alSumar={(p) => { k.agregar({ ...p, devuelto: 0, antes: null }); setSumando(false); }} />
        : <button type="button" className={css.agregar} onClick={() => setSumando(true)} data-testid="agregar-producto"><Icono nombre="mas" tam={16} />{t.agregarProducto.corto}</button>}
      <MedioDeLaCorreccion c={c} k={k} alCambiar={alCambiar} alElegirCliente={() => setEligiendoCliente(true)} />
      <div className={css.ccTotal}><span>{t.columnaTotal.corto}</span><span>{k.diferencia !== 0 && <s className={css.viejo}>{pesosCortos(v.total)}</s>}<b className="importe" data-testid="total-corregido">{pesosCortos(k.total)}</b></span></div>
      <ComoSeResuelve k={k} />
      <AvisoError texto={g.error} />
      <div className={css.botones}>
        <button type="button" className="boton" onClick={alDescartar} data-testid="descartar">{t.descartar.corto}</button>
        <GuardarCorreccion guardando={g.guardando} diferencia={k.diferencia} alGuardar={() => void g.guardar()} />
      </div>
      {eligiendoCliente && (
        <Hoja titulo={t.eligeCliente.corto} alCerrar={() => setEligiendoCliente(false)} testId="hoja-clientes">
          <ElegirCliente clientes={k.clientes} elegido={c.clienteId ?? ""} alElegir={(id) => { k.elegirCliente(id); setEligiendoCliente(false); }} />
        </Hoja>
      )}
    </div>
  );
}

// El medio y, con cuenta corriente, el cliente (si falta, lo pide).
function MedioDeLaCorreccion({ c, k, alCambiar, alElegirCliente }: { c: Correccion; k: Corrigiendo; alCambiar: (c: Correccion) => void; alElegirCliente: () => void }) {
  return (
    <div className={css.fila}>
      <MediosDePago medios={MEDIOS} elegido={c.medio} etiqueta="Medio de pago" prefijo="medio-ed" alElegir={(m) => { alCambiar({ ...c, medio: m }); if (m === "cuenta_corriente" && !c.clienteId) alElegirCliente(); }} />
      {c.medio === "cuenta_corriente" && <BotonDeCliente elegido={Boolean(k.cliente)} falta alTocar={alElegirCliente} etiqueta={k.cliente ? `Cliente: ${k.cliente.nombre}` : t.eligeCliente.corto} testId="cliente-ed"><Icono nombre="persona" tam={20} /></BotonDeCliente>}
    </div>
  );
}

function GuardarCorreccion({ guardando, diferencia, alGuardar }: { guardando: boolean; diferencia: number; alGuardar: () => void }) {
  return (
    <button type="button" className={`boton ${css.principal}`} disabled={guardando} onClick={alGuardar} data-testid="guardar-correccion">
      <span>{guardando ? "Guardando…" : t.guardarCorreccion.corto}</span>{diferencia !== 0 && !guardando && <span className={css.dif} data-testid="diferencia">{signo(diferencia)}</span>}
    </button>
  );
}

// Guardar: con la diferencia en el aviso; si otra persona la cambió mientras tanto, lo dice.
function useGuardar(v: VentaDelDia, c: Correccion, k: Corrigiendo, alGuardar: (mensaje: string) => void) {
  const { corregir, guardando } = useCorregirVenta();
  const [error, setError] = useState<string | null>(null);
  async function guardar() {
    if (k.falta) { setError(k.falta); return; }
    setError(null);
    try {
      await corregir(v, aEntrada(v, c, k.medioDif));
      alGuardar(`${t.correccionGuardada.corto}${k.diferencia ? ` · ${signo(k.diferencia)}` : ""}`);
    } catch (e) {
      setError(fueSinConexion(e) ? t.sinConexionCorregir.corto : /mientras/i.test((e as Error).message) ? t.ventaCambio.corto : `${(e as Error).message}.`);
    }
  }
  return { guardar, guardando, error };
}
