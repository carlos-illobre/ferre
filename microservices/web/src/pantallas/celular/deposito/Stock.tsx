import { useMemo, useState } from "react";
import { mensajeDeStock, productosConStock, cuentaDelStock, pasaElFiltro, useStock, type FiltroDeStock } from "../../../negocio/deposito";
import { useCatalogo } from "../../../negocio/catalogo";
import { Escaner, hayCamara } from "../../../plataforma/camara";
import { usePuede } from "../../../negocio/usuarios";
import { TEXTOS } from "../../textos";
import { AvisoError, Buscador, Toast } from "../componentes/base";
import { FiltrosDelStock } from "./FiltrosDelStock";
import { FilasDelStock } from "./FilasDelStock";
import { HojaDeStock } from "./HojaDeStock";
import { QuePedir } from "./QuePedir";
import { ResumenesDelStock } from "./ResumenesDelStock";
import css from "./Stock.module.css";

// Stock, como la v2 («La lista», decisión 148): tres números arriba (bajo el mínimo, sin stock y
// negativo), el buscador con escanear, los filtros en pastillas y cada producto con su stock en
// color. Tocar un producto abre su hoja: el stock grande, los movimientos con lo que queda
// después de cada uno y la corrección, que siempre lleva motivo (RF-53). Abajo, al pulgar,
// «Qué pedir». El dinero invertido, solo con «Ver el dinero invertido» (decisión 96).
export function Stock() {
  const x = useStockDelCelular();
  const { filas, consulta, filtro } = x;
  return (
    <div className="st">
      <AvisoError texto={x.error} alCerrar={x.cerrarError} />
      <Toast texto={x.mensaje} alCerrar={() => x.setMensaje(null)} />
      <ResumenesDelStock cuenta={x.cuenta} filtro={filtro} alElegir={(f) => x.setFiltro(filtro === f ? "todos" : f)} datos={x.puede("negocio.invertido") ? x.datos : null} />
      <div className={css.buscar}>
        <Buscador chico valor={consulta} alCambiar={x.buscar} placeholder={TEXTOS.stock.buscar.corto} alEscanear={hayCamara() ? () => x.setEscaneando(true) : undefined} />
      </div>
      {x.escaneando && <Escaner alDetectar={(codigo) => { x.setEscaneando(false); x.buscar(codigo); }} alCerrar={() => x.setEscaneando(false)} />}
      <FiltrosDelStock cuenta={x.cuenta} filtro={filtro} alElegir={x.setFiltro} />
      <FilasDelStock filas={filas} porId={x.porId} alAbrir={x.setAbierto} />
      <SinFilas x={x} />
      {x.puede("deposito.pedidos") && <QuePedir />}
      {x.productoAbierto && <HojaDeStock producto={x.productoAbierto} fila={x.porId.get(x.productoAbierto.id) ?? null} alCerrar={() => x.setAbierto(null)} alAjustar={(m) => { x.setMensaje(m); x.setAbierto(null); }} />}
    </div>
  );
}

function SinFilas({ x }: { x: ReturnType<typeof useStockDelCelular> }) {
  if (x.filas.length > 0) return null;
  if (x.consulta.trim()) return x.buscandoEnElServidor ? null : <div className="aviso-suave">Nada con "{x.consulta}".</div>;
  return x.filtro !== "todos" ? <div className="aviso-suave">Con este filtro no queda ningún producto.</div> : null;
}

// Lo buscado (o escaneado), el filtro, el producto abierto en su hoja y el aviso de la corrección.
function useStockDelCelular() {
  const { catalogo, buscandoEnElServidor, buscarProductos } = useCatalogo();
  const { datos, porId, error: fallo } = useStock();
  const puede = usePuede();
  // El aviso se puede cerrar; vuelve si el próximo pedido falla de nuevo.
  const [cerrado, setCerrado] = useState<unknown>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const [filtro, setFiltro] = useState<FiltroDeStock>("todos");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [escaneando, setEscaneando] = useState(false);
  const cuenta = useMemo(() => cuentaDelStock(datos?.productos ?? []), [datos]);
  const filas = useMemo(() => {
    const base = consulta.trim() ? buscarProductos(consulta, 100) : productosConStock(catalogo, porId);
    return base.filter((p) => pasaElFiltro(filtro, Number(porId.get(p.id)?.stock ?? 0))).slice(0, 100);
  }, [catalogo, consulta, buscarProductos, porId, filtro]);
  const buscar = (v: string) => { setConsulta(v); setAbierto(null); };
  const productoAbierto = abierto ? catalogo.find((p) => p.id === abierto) ?? filas.find((p) => p.id === abierto) ?? null : null;
  const error = !fallo || fallo === cerrado ? null : mensajeDeStock(fallo);
  return { puede, datos, porId, buscandoEnElServidor, error, cerrarError: () => setCerrado(fallo), mensaje, setMensaje, consulta, filtro, setFiltro, setAbierto, escaneando, setEscaneando, cuenta, filas, buscar, productoAbierto };
}
