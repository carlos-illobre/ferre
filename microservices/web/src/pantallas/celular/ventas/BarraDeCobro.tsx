import { MEDIOS as LOS_MEDIOS, precioDe, type Item } from "../../../negocio/ventas";
import { pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { AvisoError, Icono, Toast } from "../componentes/base";
import { BotonDeCliente } from "./BotonDeCliente";
import { Deslizar } from "./Deslizar";
import { MediosDePago } from "./MediosDePago";
import type { EstadoDeVender } from "./useVender";
import css from "./BarraDeCobro.module.css";

// El cobro, fijo abajo: los avisos (se van solos), lo que falta, el medio y el cliente, y cobrar
// deslizando. Arranca en Efectivo y vuelve a Efectivo después de cada venta (decisión 37).
export function BarraDeCobro({ v }: { v: EstadoDeVender }) {
  const { venta, deshacer } = v;
  const aviso = deshacer.aviso;
  return (
    <div className={css.cobro} data-testid="cobro">
      <div className={css.tostada}>
        <Toast texto={aviso?.texto ?? venta.mensaje} alCerrar={() => { deshacer.setAviso(null); venta.setMensaje(null); }} accion={aviso?.deshacer ? { texto: "Deshacer", alTocar: deshacer.deshacer } : undefined} />
      </div>
      <FaltanPrecios items={venta.items} />
      <AvisoError texto={venta.error} />
      <div className={css.pago}>
        <MediosDePago medios={LOS_MEDIOS} elegido={venta.medio} alElegir={venta.elegirMedio} etiqueta="Cómo paga" prefijo="medio" testId="medio" />
        <ClienteDeLaVenta v={v} />
      </div>
      <Deslizar apagado={!venta.items.length || venta.ocupado} ocupado={venta.ocupado} alCobrar={venta.cobrar} alTocar={() => deshacer.setAviso({ texto: TEXTOS.vender.comoSeCobra.corto })}>
        <TextoDelCobro ocupado={venta.ocupado} total={venta.total} />
      </Deslizar>
    </div>
  );
}

function FaltanPrecios({ items }: { items: Item[] }) {
  const faltan = items.filter((it) => precioDe(it).unitario === null);
  if (!faltan.length) return null;
  return <div className={css.falta}><Icono nombre="alerta" tam={18} />{faltan.length === 1 ? `Falta el precio de ${faltan[0]!.descripcion}` : `Faltan ${faltan.length} precios`}</div>;
}

function TextoDelCobro({ ocupado, total }: { ocupado: boolean; total: number }) {
  if (ocupado) return <span>Cobrando…</span>;
  return <><span>{TEXTOS.vender.deslizaParaCobrar.corto}</span><span className="importe" data-testid="total">{pesosCortos(total)}</span></>;
}

const iniciales = (nombre: string) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

function ClienteDeLaVenta({ v }: { v: EstadoDeVender }) {
  const { cliente, medio } = v.venta;
  const falta = medio === "cuenta_corriente";
  const etiqueta = cliente ? `Cliente: ${cliente.nombre}` : falta ? TEXTOS.vender.elegiElCliente.corto : TEXTOS.vender.clienteOpcional.corto;
  return (
    <BotonDeCliente elegido={Boolean(cliente)} falta={falta} alTocar={() => v.setHoja("clientes")} etiqueta={etiqueta} titulo={cliente?.nombre} testId="cliente" redondo>
      {cliente ? <b>{iniciales(cliente.nombre)}</b> : <Icono nombre="persona" tam={20} />}
    </BotonDeCliente>
  );
}
