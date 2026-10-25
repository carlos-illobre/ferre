import { useEspejar } from "../../../negocio/espejo";
import { irA, type Ruta } from "../rutas";

// Depósito sin pestaña elegida es Inventario, y se lo nombra así: es como lo nombra la
// computadora. Si cada uno nombrara distinto la misma pantalla, la computadora le devolvería
// al celular su propio nombre y lo traería de vuelta a Depósito aunque ya se hubiera ido a otra parte.
function subEnEspejo(ruta: Ruta, parte: string) {
  if (ruta.nombre === "negocio") return "/negocio";
  if (ruta.sub) return `/${ruta.sub}`;
  return parte === "deposito" ? "/stock" : "";
}

// La parte en que está el celular, como la nombra la computadora; null si no viaja.
function parteEnEspejo(ruta: Ruta, conSesion: boolean): string | null {
  const sinHash = location.hash.replace(/^#\/?/, "") === "";
  const parte = sinHash ? "catalogo" : ruta.nombre === "negocio" ? "mas" : ruta.nombre;
  // El ingreso que se abre desde un pedido («llegó la mercadería») también viaja, con su pedido.
  const pedido = ruta.parametros.get("pedido");
  const soloElPedido = [...ruta.parametros.keys()].every((k) => k === "pedido");
  if (!conSesion || !soloElPedido || !["catalogo", "vender", "deposito", "mas"].includes(parte)) return null;
  return `${parte}${subEnEspejo(ruta, parte)}${pedido ? `?pedido=${pedido}` : ""}`;
}

// En espejo con la computadora (decisión 60): los dos están en la misma parte. Las pantallas
// que son solo de este dispositivo (la cámara, un enlace con código) no viajan.
export function useParteEnEspejo(ruta: Ruta, conSesion: boolean) {
  const parte = parteEnEspejo(ruta, conSesion);
  useEspejar<string | null>("ir", parte, (p) => { if (p && conSesion) irA(p); }, parte !== null);
}
