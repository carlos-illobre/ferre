import type { ReactNode } from "react";
import { primerNombre, type Periodo } from "../../../negocio/actividad";
import { CATEGORIAS } from "../../comun/negocio/actividad-en-palabras";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";
import type { ActividadDelCelular } from "./useActividadDelCelular";
import css from "./Actividad.module.css";

export const PERIODOS: { valor: Periodo; nombre: string }[] = [{ valor: "hoy", nombre: "Hoy" }, { valor: "ayer", nombre: "Ayer" }, { valor: "semana", nombre: "Esta semana" }, { valor: "rango", nombre: "Desde… hasta" }];

// Una pastilla con su ícono y lo elegido; debajo, invisible, el desplegable que la cambia.
function Pastilla({ icono, texto, clase, children }: { icono: NombreDeIcono; texto: string; clase: string; children: ReactNode }) {
  return <label className={`${css.chip} ${clase}`}><Icono nombre={icono} tam={18} /><span>{texto}</span><Icono nombre="chevron-down" tam={16} />{children}</label>;
}

function textosDeLasPastillas({ filtros: f, usuarios }: ActividadDelCelular) {
  const quien = f.usuario ? primerNombre(usuarios.find((u) => u.id === f.usuario)?.nombre ?? null) : "Todos";
  const tipo = f.grupo || (f.tipo ? CATEGORIAS.find((c) => c.tipo === f.tipo)?.nombre ?? "Tipo" : "Todo tipo");
  return { quien, tipo };
}

function Rango({ x: { filtros: f, filtrar } }: { x: ActividadDelCelular }) {
  return (
    <div className={css.rango}>
      <label><span>Desde</span><input type="date" value={f.desde} max={f.hasta || undefined} onChange={(e) => filtrar({ desde: e.target.value })} data-testid="filtro-desde" /></label>
      <label><span>Hasta</span><input type="date" value={f.hasta} min={f.desde || undefined} onChange={(e) => filtrar({ hasta: e.target.value })} data-testid="filtro-hasta" /></label>
    </div>
  );
}

// Los filtros en pastillas: el período, quién y el tipo; con «Desde… hasta», los dos días.
export function FiltrosDelCelular({ x, periodo }: { x: ActividadDelCelular; periodo: string }) {
  const { filtros: f, filtrar, usuarios } = x;
  const { quien, tipo } = textosDeLasPastillas(x);
  return (
    <>
      <div className={css.filtros}>
        <Pastilla icono="calendar" clase="oscuro" texto={periodo === "Todo" ? "Todo" : PERIODOS.find((p) => p.valor === f.periodo)!.nombre}>
          <select aria-label="Período" value={f.periodo} onChange={(e) => filtrar({ periodo: e.target.value as Periodo })} data-testid="filtro-periodo">{PERIODOS.map((p) => <option key={p.valor} value={p.valor}>{p.nombre}</option>)}</select>
        </Pastilla>
        <Pastilla icono="users" clase={f.usuario ? "puesto" : ""} texto={quien}>
          <select aria-label="Quién" value={f.usuario} onChange={(e) => filtrar({ usuario: e.target.value })} data-testid="filtro-usuario"><option value="">Todos</option>{usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}{u.activo ? "" : " (desactivado)"}</option>)}</select>
        </Pastilla>
        <Pastilla icono="list-filter" clase={f.grupo || f.tipo ? "puesto" : ""} texto={tipo}>
          <select aria-label="Qué" value={f.grupo} onChange={(e) => filtrar({ grupo: e.target.value, tipo: "" })} data-testid="filtro-tipo"><option value="">Todo tipo</option>{x.grupos.map((g) => <option key={g} value={g}>{g}</option>)}</select>
        </Pastilla>
      </div>
      {f.periodo === "rango" && <Rango x={x} />}
    </>
  );
}
