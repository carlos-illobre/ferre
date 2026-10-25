import { Icono, type NombreDeIcono } from "../base/ui";
import { cuantosConHuella, type CelularDeOtroFila, type SesionFila, type UsuarioFila } from "../../../negocio/usuarios";
import css from "./Usuarios.module.css";

// Arriba de la lista, los cuatro números de la v2: activos, sesiones, con huella y sin usar.
function Kpi({ icono, valor, etiqueta, gris, title }: { icono: NombreDeIcono; valor: number | string; etiqueta: string; gris?: boolean; title?: string }) {
  return <div className={css.kpi} title={title}><span className={css.kpiIco}><Icono nombre={icono} /></span><span className={`${css.kpiVa}${gris ? ` ${css.gris}` : ""}`}>{valor}</span><span className={css.kpiEt}>{etiqueta}</span></div>;
}

export function KpisDeUsuarios({ filas, sesiones, celulares }: { filas: UsuarioFila[]; sesiones: SesionFila[] | null; celulares: CelularDeOtroFila[] | null }) {
  const activos = filas.filter((u) => u.activo).length;
  return (
    <div className={css.kpis}>
      <Kpi icono="users" valor={activos} etiqueta={`activos de ${filas.length}`} />
      <Kpi icono="monitor" valor={sesiones ? sesiones.length : "—"} etiqueta={sesiones?.length === 1 ? "sesión" : "sesiones"} />
      <Kpi icono="fingerprint" valor={celulares ? cuantosConHuella(celulares) : "—"} etiqueta="con huella" />
      <Kpi icono="hourglass" valor="—" etiqueta="sin usar 30 días" gris title="Todavía no se sabe quién no entra hace 30 días" />
    </div>
  );
}
