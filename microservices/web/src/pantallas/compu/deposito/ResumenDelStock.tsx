import type { ReactNode } from "react";
import type { FiltroDeStock, Stock } from "../../../negocio/deposito";
import { TEXTOS } from "../../textos";
import { pesosEnteros } from "../../comun/deposito/movimientos";
import { Explicado, numero } from "../base/ui";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";
import { plural } from "./deposito-comun";
import type { Inventario } from "./useInventario";
import css from "./Inventario.module.css";

// Los números del depósito: con stock, bajo el mínimo (todavía no), sin stock y negativo, que
// filtran la lista; y el dinero invertido, con de dónde sale, solo con su permiso.
const t = TEXTOS.stock;

export function ResumenDelStock({ x, datos }: { x: Inventario; datos: Stock }) {
  const { cuenta } = x;
  const tarjeta = (valor: FiltroDeStock | null, clase: string, icono: NombreDeIcono, rotulo: string, cifra: string, testId: string) =>
    <Resumen x={x} valor={valor} clase={clase} icono={icono} rotulo={rotulo} cifra={cifra} testId={testId} />;
  return (
    <div className={`${css.resumenes} ${x.veInvertido ? "" : "sin-dinero"}`} data-testid="valorizacion">
      {tarjeta("con", "logro", "package-check", t.conStock.largo, numero(cuenta.con), "con-stock")}
      {tarjeta(null, "urgente", "trending-down", t.bajoElMinimo.largo, "—", "bajo-el-minimo")}
      {tarjeta("cero", "neutro", "package-minus", t.sinStock.largo, numero(cuenta.enCero), "sin-stock")}
      {tarjeta("negativo", cuenta.negativos ? "error" : "neutro", "circle-alert", t.negativo.largo, numero(cuenta.negativos), "stock-negativo")}
      {x.veInvertido && <DineroInvertido datos={datos} />}
    </div>
  );
}

type Props = { x: Inventario; valor: FiltroDeStock | null; clase: string; icono: NombreDeIcono; rotulo: string; cifra: ReactNode; testId: string };
function Resumen({ x, valor, clase, icono, rotulo, cifra, testId }: Props) {
  const contenido = <><span className={css.ico}><Icono nombre={icono} /></span><span><span className={css.et}>{rotulo}</span><span className={css.va}>{cifra}</span></span></>;
  if (!valor) return <div className={`${css.resumen} ${clase}`} data-testid={testId}>{contenido}</div>;
  return <button type="button" className={`${css.resumen} ${clase}`} aria-pressed={x.filtro === valor} onClick={() => x.setFiltro(x.filtro === valor ? "todos" : valor)} data-testid={testId}>{contenido}</button>;
}

function DineroInvertido({ datos }: { datos: Stock }) {
  return (
    <div className={`${css.resumen} dinero`} data-testid="dinero-invertido-stock">
      <span className={css.ico}><Icono nombre="coins" /></span>
      <span><span className={css.et}>{t.dineroInvertido.largo}</span>
        <span className={css.va}><Explicado valor={pesosEnteros(datos.valor_total)} etiqueta="Dinero invertido" titulo="De dónde sale el dinero invertido" pasos={pasosDelInvertido(datos.por_proveedor, datos.valor_total)} /></span></span>
      <span className={css.candado} title="Lo ve solo quien tiene el permiso «Ver el dinero invertido»"><Icono nombre="lock" tam={16} /></span>
    </div>
  );
}

// De dónde sale el dinero invertido: proveedor por proveedor.
function pasosDelInvertido(porProveedor: Record<string, { valor: number; productos: number }>, total: number): string[] {
  const pasos = Object.entries(porProveedor).filter(([, v]) => v.valor > 0).sort((a, b) => b[1].valor - a[1].valor)
    .map(([nombre, v]) => `${nombre}, ${plural(v.productos, "producto", "productos")}: ${pesosEnteros(v.valor)}`);
  return [...(pasos.length ? pasos : ["Ningún producto con stock tiene costo cargado"]), `Dinero invertido: ${pesosEnteros(total)}`];
}
