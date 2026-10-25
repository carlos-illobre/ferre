import { productoEnMemoria, urlDeFoto } from "../../../negocio/catalogo";
import { Icono } from "../../../ui/iconos";
import css from "./Contar.module.css";

// La foto del producto si este dispositivo la tiene; si no, el ícono de la v2.
export function FotoChica({ id, grande }: { id: string; grande?: boolean }) {
  const url = urlDeFoto(productoEnMemoria(id)?.foto_url ?? null);
  return <span className={`${css.foto} ${grande ? "grande" : ""}`}>{url ? <img src={url} alt="" loading="lazy" /> : <Icono nombre="hash" tam={grande ? 22 : 18} />}</span>;
}
