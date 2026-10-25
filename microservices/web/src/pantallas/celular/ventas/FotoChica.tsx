import { urlDeFoto } from "../../../negocio/catalogo";
import { Icono } from "../componentes/base";
import css from "./VentasDelDia.module.css";

// La foto de un renglón al corregir o cambiar; sin foto, el ícono de imagen.
export function FotoChica({ url }: { url: string | null }) {
  const foto = urlDeFoto(url);
  return <span className={css.foto}>{foto ? <img src={foto} alt="" /> : <Icono nombre="imagen" tam={18} />}</span>;
}
