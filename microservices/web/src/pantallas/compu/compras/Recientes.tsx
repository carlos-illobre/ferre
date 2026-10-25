import { useMemo, useState, type KeyboardEvent } from "react";
import { esDeLaSemana, type CompraFila, type Gastos, type useComprasRecientes } from "../../../negocio/compras";
import { TEXTOS } from "../../textos";
import { useAbiertas } from "../../comun/compras/useAbiertas";
import { usePuede } from "../../permisos";
import { Aviso, Boton, pesosCortos } from "../base/ui";
import { mensajeDe } from "../deposito/deposito-comun";
import { AnularCompra } from "./AnularCompra";
import { CompraReciente } from "./CompraReciente";
import css from "./Compras.module.css";

// Las últimas compras, con la miniatura de su comprobante. Cada una se abre para ver sus renglones
// y se puede anular; anular no se deshace, por eso pide confirmación con el motivo ahí mismo.
// Flechas recorren las compras; Supr anula la que tiene el foco.
type Filtro = "semana" | "anuladas" | null;
const t = TEXTOS.compras;
type Props = { compras: ReturnType<typeof useComprasRecientes>; gastos: Gastos | null; enLinea: boolean; alAnular: (mensaje: string) => void };

export function Recientes({ compras, gastos, enLinea, alAnular }: Props) {
  const anula = usePuede()("deposito.ingresos");
  const filas = compras.datos;
  const error = compras.error ? mensajeDe(compras.error, "Sin conexión: las compras recientes se ven cuando vuelve internet.") : null;
  const f = useFiltroDeCompras(filas, gastos);
  const { abiertas, alternar } = useAbiertas();
  const [anulando, setAnulando] = useState<CompraFila | null>(null);
  function teclas(e: KeyboardEvent<HTMLButtonElement>, c: CompraFila) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") moverEntreCompras(e);
    else if (e.key === "Delete" && c.estado !== "anulada" && anula) { e.preventDefault(); setAnulando(c); }
  }
  const anulada = () => { const c = anulando!; setAnulando(null); alAnular(`Compra a ${c.proveedor} por ${pesosCortos(c.total)} anulada: el stock que había sumado se descontó.`); };
  return (
    <section className={css.recientes} aria-labelledby="cv-recientes" data-testid="compras-recientes">
      <div className={css.recientesCab}>
        <h2 id="cv-recientes">{t.comprasRecientes.largo}</h2>
        <FiltrosDeCompras f={f} />
      </div>
      <Aviso tipo="alerta" accion={<Boton tam="chico" icono="repetir" onClick={compras.recargar}>Reintentar</Boton>}>{error}</Aviso>
      <SinCompras filas={filas} error={error} visibles={f.visibles.length} />
      {f.visibles.length > 0 && (
        <ul className={css.lista}>
          {f.visibles.map((c) => <CompraReciente key={c.id} c={c} abierta={abiertas.has(c.id)} anula={anula} alAlternar={() => alternar(c.id)} alTeclear={(e) => teclas(e, c)} alAnular={() => setAnulando(c)} />)}
        </ul>
      )}
      {anulando && <AnularCompra compra={anulando} enLinea={enLinea} alCerrar={() => setAnulando(null)} alAnular={anulada} />}
    </section>
  );
}

// De entrada, las de la semana; si en la semana no hubo ninguna, todas.
function useFiltroDeCompras(filas: CompraFila[] | null, gastos: Gastos | null) {
  const deLaSemana = useMemo(() => (filas ?? []).filter((c) => esDeLaSemana(c, gastos)), [filas, gastos]);
  const anuladas = useMemo(() => (filas ?? []).filter((c) => c.estado === "anulada"), [filas]);
  const [filtro, setFiltro] = useState<Filtro | "inicio">("inicio");
  const actual: Filtro = filtro === "inicio" ? (deLaSemana.length ? "semana" : null) : filtro;
  const visibles = actual === "semana" ? deLaSemana : actual === "anuladas" ? anuladas : (filas ?? []);
  return { deLaSemana, anuladas, actual, visibles, elegir: (f: Filtro) => setFiltro(actual === f ? null : f) };
}

function FiltrosDeCompras({ f }: { f: ReturnType<typeof useFiltroDeCompras> }) {
  return (
    <div className={css.chips} role="group" aria-label="Qué compras mostrar">
      <button type="button" className={`${css.chip} ${f.actual === "semana" ? "elegido" : ""}`} aria-pressed={f.actual === "semana"} onClick={() => f.elegir("semana")}>{t.estaSemana.largo} ({f.deLaSemana.length})</button>
      <button type="button" className={css.chip} disabled title={t.todaviaNo.largo}>{t.sinPagar.largo} (—)</button>
      <button type="button" className={`${css.chip} ${f.actual === "anuladas" ? "elegido" : ""}`} aria-pressed={f.actual === "anuladas"} onClick={() => f.elegir("anuladas")}>{t.anuladas.largo} ({f.anuladas.length})</button>
    </div>
  );
}

function SinCompras({ filas, error, visibles }: { filas: CompraFila[] | null; error: string | null; visibles: number }) {
  if (filas === null) return error ? null : <div className="compras-cargando" aria-busy="true"><span className="solo-lectores">Trayendo las compras…</span><div className="esqueleto" /><div className="esqueleto" /><div className="esqueleto" /></div>;
  if (filas.length === 0) return <p className="detalle">No hay compras registradas. La primera aparece acá cuando registres un ingreso de mercadería.</p>;
  return visibles === 0 ? <p className="detalle">Ninguna compra con este filtro.</p> : null;
}

function moverEntreCompras(e: KeyboardEvent<HTMLButtonElement>) {
  const todos = [...(e.currentTarget.closest("ul")?.querySelectorAll<HTMLButtonElement>("[data-abre-compra]") ?? [])];
  const destino = todos[todos.indexOf(e.currentTarget) + (e.key === "ArrowDown" ? 1 : -1)];
  if (destino) { e.preventDefault(); destino.focus(); }
}
