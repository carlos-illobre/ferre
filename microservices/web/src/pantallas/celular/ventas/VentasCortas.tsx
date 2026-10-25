import { loQueSeLlevo, NOMBRE_DE_MEDIO, type VentaDelDia } from "../../../negocio/ventas";
import { conUnidad } from "../../../negocio/catalogo";
import { pesosCortos } from "../../../formato";
import { IconoDeMedio } from "../../IconoDeMedio";
import { TEXTOS } from "../../textos";
import { Resaltar } from "../../comun/ventas/Resaltar";
import { hora } from "../../comun/ventas/textos-del-dia";
import { Icono } from "../componentes/base";
import { useRecienAnuladas } from "./useRecienAnuladas";
import css from "./VentasDelDia.module.css";

// Cada venta, un renglón corto; tocarla abre su hoja. Buscando, el renglón muestra el producto que
// coincide («3 × Mecha… y 1 más»).
const t = TEXTOS.hoy;
type Props = { ventas: VentaDelDia[]; buscado: string; alAbrir: (v: VentaDelDia) => void; sinVentas: string };

export function VentasCortas({ ventas, buscado, alAbrir, sinVentas }: Props) {
  const tachando = useRecienAnuladas(ventas);
  if (ventas.length === 0) return <div className="aviso-suave" data-testid="sin-ventas">{sinVentas}</div>;
  return (
    <ul className={css.ventas} data-testid="ventas-de-hoy">
      {ventas.map((v) => <VentaCorta key={v.id} venta={v} buscado={buscado} tachando={tachando.has(v.id)} alAbrir={() => alAbrir(v)} />)}
    </ul>
  );
}

function VentaCorta({ venta: v, buscado, tachando, alAbrir }: { venta: VentaDelDia; buscado: string; tachando: boolean; alAbrir: () => void }) {
  const anulada = v.estado === "anulada";
  const { una, mas } = loQueSeLlevo(v, buscado);
  return (
    <li className={`${anulada ? "anulada" : ""} ${tachando ? "tachando" : ""}`} data-testid="venta-dia">
      <button type="button" className={css.venta} onClick={alAbrir}>
        <IconoDeMedio medio={v.medio_pago} tam={20} conFondo />
        <span className={css.ventaTexto}>
          <b>{una ? <>{conUnidad(una.cantidad, una.unidad)} <Resaltar texto={una.descripcion} buscado={buscado} />{mas > 0 ? ` y ${mas} más` : ""}</> : `${v.items.length} ${t.productos.corto}`}{anulada && <span className={css.anulada}>{t.anulada.corto}</span>}</b>
          <small>{hora(v.fecha)} · {NOMBRE_DE_MEDIO[v.medio_pago as keyof typeof NOMBRE_DE_MEDIO] ?? v.medio_pago}{v.cliente ? <> · <Resaltar texto={v.cliente} buscado={buscado} /></> : ""}</small>
        </span>
        <strong className="importe">{pesosCortos(v.total)}</strong>
        <Icono nombre="derecha" tam={18} />
      </button>
    </li>
  );
}
