import { useEffect, useState } from "react";
import { urlDeFoto } from "../../api";
import { Icono } from "./Icono";

type Props = {
  /** El producto de la API (o cualquier cosa con su foto y su nombre). */
  producto: { foto_url?: string | null; descripcion: string };
  /** `chica` (48 px, para los renglones), `mediana` (96 px, en la ficha) o `grande` (ampliada). */
  tam?: "chica" | "mediana" | "grande";
};

/** La foto de un producto: cuadrada, de esquinas redondeadas. Sin foto (o si no carga), un marcador vacío con una cámara tenue. */
export function FotoDeProducto({ producto, tam = "chica" }: Props) {
  const url = urlDeFoto(producto.foto_url);
  const [fallo, setFallo] = useState(false);
  useEffect(() => { setFallo(false); }, [url]);
  if (!url || fallo) {
    return <span className={`foto foto--${tam} foto--sin`} role="img" aria-label="Sin foto"><Icono nombre="camara" tam={tam === "chica" ? 22 : tam === "mediana" ? 32 : 56} grosor={tam === "chica" ? 1.7 : 1.5} /></span>;
  }
  return (
    <span className={`foto foto--${tam}`}>
      <img src={url} alt={`Foto de ${producto.descripcion}`} loading="lazy" onError={() => setFallo(true)} />
    </span>
  );
}
