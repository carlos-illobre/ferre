import { aRenglones, ESTADOS, esperaMercaderia, pluralDelPedido, totalDelPedido, type Pedido } from "../../../negocio/deposito";
import { AlLadoDeLasPestanas } from "../../AlLadoDeLasPestanas";
import { HojaDePedidos } from "./HojaDePedidos";
import { LlegoLaMercaderia } from "./LlegoLaMercaderia";
import { dia, pesos } from "./formato-de-pedidos";
import type { PantallaDePedidos } from "./usePantallaDePedidos";
import css from "./Pedidos.module.css";

// La lista: lo que se encargó y todavía no llegó, primero; después lo que no se mandó y lo cerrado.
const CERRADOS: Pedido["estado"][] = ["recibido", "cancelado", "cerrado_incompleto"];

export function ListaDePedidos({ x, alIngresar }: { x: PantallaDePedidos; alIngresar: (id: string) => void }) {
  const todos = x.pedidos ?? [];
  const grupo = (titulo: string, testId: string, cuales: Pedido[]) => cuales.length > 0 && (
    <><h2>{titulo}</h2><ul className={css.lista} data-testid={testId}>{cuales.map((p) => <TarjetaDePedido key={p.id} p={p} ingresa={x.ingresa} alAbrir={() => x.setAbiertoId(p.id)} alIngresar={alIngresar} />)}</ul></>
  );
  return (
    <section className="pd" data-testid="pedidos">
      <header className={css.cabeza}>
        <div className={css.crece}><h1>Pedidos a proveedores</h1><p className={css.bajada}>Lo que se encargó y todavía no llegó, primero.</p></div>
        {x.encarga && <AlLadoDeLasPestanas><button type="button" className={`${css.boton} principal`} onClick={() => x.setEligiendo(true)} data-testid="pedido-nuevo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>Pedido nuevo</button></AlLadoDeLasPestanas>}
      </header>
      <AvisosDeLaLista x={x} />
      {grupo("Por llegar", "por-llegar", todos.filter(esperaMercaderia))}
      {grupo("Sin mandar", "sin-mandar", todos.filter((p) => p.estado === "borrador"))}
      {grupo("Cerrados", "cerrados", todos.filter((p) => CERRADOS.includes(p.estado)))}
      {x.eligiendo && <ElegirProveedor x={x} />}
    </section>
  );
}

function AvisosDeLaLista({ x }: { x: PantallaDePedidos }) {
  return (
    <>
      {x.aviso && <p className={css.aviso} role="status" data-testid="mensaje-pedidos">{x.aviso}</p>}
      {x.error && <p className={css.error} role="alert">{x.error} <button type="button" className={`${css.boton} chico`} onClick={() => void x.cargar()}>Reintentar</button></p>}
      {!x.pedidos && !x.error && <p className={css.bajada}>Buscando los pedidos…</p>}
      {x.pedidos?.length === 0 && <p className={css.vacio} data-testid="sin-pedidos">{x.encarga ? "Todavía no hay pedidos. Con «Pedido nuevo» elegís el proveedor y agregás lo que hay que pedirle." : "No hay pedidos esperando mercadería."}</p>}
    </>
  );
}

function ElegirProveedor({ x }: { x: PantallaDePedidos }) {
  return (
    <HojaDePedidos titulo="¿A qué proveedor le vas a pedir?" alCerrar={() => x.setEligiendo(false)} testId="elegir-proveedor">
      {x.proveedores.length === 0 && <p className={css.bajada}>No hay proveedores cargados. Se dan de alta en Catálogo → Listas.</p>}
      <ul className={css.opciones}>
        {x.proveedores.map((p) => <li key={p.id}><button type="button" className={`${css.boton} ancho`} onClick={() => x.empezar(p.id)} data-testid="proveedor-opcion">{p.nombre}</button></li>)}
      </ul>
    </HojaDePedidos>
  );
}

// Cuándo se mandó o armó, cuántos renglones, cuántos faltan y quién lo mandó o canceló.
function detalleDe(p: Pedido): string {
  const faltan = p.items.filter((i) => Number(i.recibido) < Number(i.cantidad)).length;
  const conFaltantes = p.estado === "recibido_parcial" || p.estado === "cerrado_incompleto";
  return [p.enviado_en ? dia(p.enviado_en) : `armado el ${dia(p.creado_en)}`, pluralDelPedido(p.items.length, "renglón", "renglones"),
    conFaltantes ? `${faltan === 1 ? "falta" : "faltan"} ${faltan}` : null, quienLoHizo(p)].filter(Boolean).join(" · ");
}

// Quién lo canceló o lo mandó, si se sabe.
function quienLoHizo(p: Pedido): string | null {
  if (p.estado === "cancelado" && p.cerrado_por) return `lo canceló ${p.cerrado_por}`;
  return p.estado === "enviado" && p.enviado_por ? `lo mandó ${p.enviado_por}` : null;
}

function TarjetaDePedido({ p, ingresa, alAbrir, alIngresar }: { p: Pedido; ingresa: boolean; alAbrir: () => void; alIngresar: (id: string) => void }) {
  return (
    <li className={css.pedido} data-testid="pedido">
      <button type="button" className={css.abrir} onClick={alAbrir} aria-label={`Abrir el pedido a ${p.proveedor}, ${ESTADOS[p.estado]}`}>
        <span className={css.quien}><strong>{p.proveedor}</strong><span className={css.detalle}>{detalleDe(p)}</span></span>
        <span className={css.cuanto}><strong className={css.importe}>{pesos(totalDelPedido(aRenglones(p)))}</strong><span className={`${css.estado} ${p.estado}`}>{ESTADOS[p.estado]}</span></span>
      </button>
      {ingresa && esperaMercaderia(p) && <LlegoLaMercaderia p={p} alIngresar={alIngresar} />}
    </li>
  );
}
