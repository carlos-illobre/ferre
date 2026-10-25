import type { Union } from "../../../negocio/catalogo";
import { TEXTOS } from "../../textos";
import { diaYMes } from "../../comun/catalogo/fechas-de-listas";
import { Icono } from "../componentes/base";
import { FotoProducto } from "../componentes/Foto";
import css from "./Duplicados.module.css";

// Una unión, como la v2: la foto, el nombre con «Separar» a su derecha y, debajo, la marca, los
// proveedores y cuándo, y a cuál unió.
export function UnionHecha({ u, alSeparar }: { u: Union; alSeparar: () => void }) {
  return (
    <div className={css.unida} data-testid="union">
      <span className={`${css.foto} chica`}>{u.foto_url ? <FotoProducto id={u.conservado_id} url={u.foto_url} descripcion={u.conservado} /> : <Icono nombre="imagen" tam={20} />}</span>
      <b className={css.unidaN}>{u.conservado}</b>
      <button type="button" className={css.separar} onClick={alSeparar} aria-label={`Separar «${u.absorbido}» de «${u.conservado}»`}><Icono nombre="dividir" tam={16} />{TEXTOS.duplicados.separar.corto}</button>
      <span className={css.unidaD}>{[u.marca, u.proveedores, diaYMes(u.unido_en.slice(0, 10))].filter(Boolean).join(" · ")}</span>
      <span className={css.unidaD}>Unió «{u.absorbido}»</span>
    </div>
  );
}
