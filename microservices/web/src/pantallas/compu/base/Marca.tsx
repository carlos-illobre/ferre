import { Isotipo, Logotipo } from "../../Logotipo";

// La marca: una tuerca ámbar con la F calada, y el nombre en Archivo ancha.
export function Marca({ tam = 30, soloSimbolo }: { tam?: number; soloSimbolo?: boolean }) {
  // La marca es el logotipo: el isotipo hace de F en la palabra (decisión 48). Siempre va sobre el verde oscuro.
  return <span className="marca" style={{ fontSize: Math.round(tam * 0.85) }}>{soloSimbolo ? <Isotipo lado={tam} /> : <Logotipo />}</span>;
}
