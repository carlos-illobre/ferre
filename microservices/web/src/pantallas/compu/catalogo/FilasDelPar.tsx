import type { ReactNode } from "react";
import { cuantoMasCaro, masBaratoDe, plano, type Lado, type Resumen, type Sugerencia } from "../../../negocio/catalogo";
import { fecha, pesos, numero } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Atajo, Icono } from "../base/ui";
import css from "./Duplicados.module.css";

// La tabla del par: el producto con «Conservar este», la marca, el código, el proveedor, el costo
// y la lista. Lo que difiere se marca del lado que no se conserva; lo que coincide, con un tilde.
type Props = { s: Sugerencia; conservar: Lado; quieto: boolean; alConservar: (lado: Lado) => void };
const LADOS = ["a", "b"] as const;
const otro = (lado: Lado): Lado => (lado === "a" ? "b" : "a");
const diasDesde = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(`${iso.slice(0, 10)}T00:00:00`).getTime()) / 86400000));
const deLaLista = (f: string | null) => (f ? `${fecha(f)} · hace ${diasDesde(f)} ${diasDesde(f) === 1 ? "día" : "días"}` : null);

export function FilasDelPar({ s, conservar, quieto, alConservar }: Props) {
  const celda = (lado: Lado, valor: string | null, igualA: (p: Resumen) => string | null) => <Celda s={s} lado={lado} sale={lado === otro(conservar)} valor={valor} igualA={igualA} />;
  const fila = (rotulo: string, contenido: (lado: Lado) => ReactNode) => (
    <>
      <div className={css.r}>{rotulo}</div>
      {LADOS.map((lado) => <div key={lado} className={`${css.cel} ${lado === conservar ? "elegida" : ""}`}>{contenido(lado)}</div>)}
    </>
  );
  return (
    <div className={css.dvTabla} role="radiogroup" aria-label="Qué producto se conserva si son el mismo">
      <div className={`${css.r} ${css.h}`}>Producto</div>
      {LADOS.map((lado) => (
        <div key={lado} className={`${css.cel} ${css.h} ${lado === conservar ? "elegida" : ""}`}>
          <button type="button" role="radio" aria-checked={lado === conservar} className={`${css.cons} ${lado === conservar ? "si" : ""}`} disabled={quieto} onClick={() => alConservar(lado)} data-testid={`conservar-${lado}`}>
            <span className={css.radio} aria-hidden="true" />{TEXTOS.duplicados.conservarEste.largo}<Atajo accion={`duplicados.conservar-${lado}`} />
          </button>
          <span className={css.prod}>
            <span className={`${css.foto} grande`} aria-hidden="true"><Icono nombre="productos" tam={22} /></span>
            <span className={css.prodN}>{celda(lado, s[lado].descripcion, (p) => p.descripcion)}</span>
          </span>
        </div>
      ))}
      {fila("Marca", (lado) => celda(lado, s[lado].marca, (p) => p.marca))}
      {fila("Cód. barras", (lado) => celda(lado, s[lado].codigo_barras, (p) => p.codigo_barras))}
      {fila("Proveedor", (lado) => s[lado].proveedor ?? "Sin proveedor")}
      {fila("Costo", (lado) => <Costo s={s} lado={lado} />)}
      {fila("Lista", (lado) => celda(lado, deLaLista(s[lado].fecha_lista), (p) => p.fecha_lista))}
    </div>
  );
}

function Celda({ s, lado, sale, valor, igualA }: { s: Sugerencia; lado: Lado; sale: boolean; valor: string | null; igualA: (p: Resumen) => string | null }) {
  if (!sale) return <>{valor ?? "—"}</>;
  const coincide = plano(igualA(s[lado])) === plano(igualA(s[otro(lado)])) && valor !== null;
  return coincide ? <>{valor}<span className={css.ok} aria-label="coincide"><Icono nombre="tilde" tam={16} grosor={2.4} /></span></> : <span className={css.difiere}>{valor ?? "—"}</span>;
}

function Costo({ s, lado }: { s: Sugerencia; lado: Lado }) {
  const barato = masBaratoDe(s);
  return (
    <>
      <span className={css.costo}>{s[lado].costo_neto ? pesos(s[lado].costo_neto) : "Sin costo"}</span>
      {barato === lado && <span className={css.barato}><Icono nombre="tilde" tam={14} grosor={3} />{TEXTOS.duplicados.elMasBarato.largo}</span>}
      {barato && barato !== lado && <span className={css.mas}>+{numero(cuantoMasCaro(s, lado))} %</span>}
    </>
  );
}
