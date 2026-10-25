import { useEspejar } from "../../../negocio/espejo";
import { irA, type Ruta } from "../base/rutas";
import { A_PARTE_COMUN, DE_PARTE_COMUN, type Parte } from "./menu";

// En espejo con el celular (decisión 60): los dos están en la misma parte. Las direcciones del
// celular y las de la computadora no son las mismas: viajan con un nombre común. El ingreso que se
// abre desde un pedido («llegó la mercadería») también viaja, con su pedido.
type Menu = Parte[];
// La parte que llega del otro dispositivo, en una dirección de esta interfaz: Depósito abre su
// primera pestaña que se ve.
const destinoDe = (base: string, menu: Menu) => (base === "deposito" ? (menu.find((m) => m.clave === "deposito")?.pestanas[0]?.ruta ?? "stock") : DE_PARTE_COMUN[base]);
const enEspejo = (actual: string, pedido: string | null) => `${A_PARTE_COMUN[actual]}${pedido ? `?pedido=${pedido}` : ""}`;

function ir(parte: string, menu: Menu, actual: string, consultaActual: string) {
  const [base = "", consulta = ""] = parte.split("?");
  const destino = destinoDe(base, menu);
  if (destino && (destino !== actual || consulta !== consultaActual)) irA(consulta ? `${destino}?${consulta}` : destino);
}

export function useEspejoDeLaParte(ruta: Ruta, actual: string, conSesion: boolean, menu: Menu) {
  const pedidoDeLaRuta = ruta.parametros.get("pedido");
  const soloElPedido = [...ruta.parametros.keys()].every((k) => k === "pedido");
  const parteEnEspejo = conSesion && soloElPedido && A_PARTE_COMUN[actual] ? enEspejo(actual, pedidoDeLaRuta) : null;
  const consultaActual = pedidoDeLaRuta ? `pedido=${pedidoDeLaRuta}` : "";
  useEspejar<string | null>("ir", parteEnEspejo, (parte) => {
    if (parte && conSesion) ir(parte, menu, actual, consultaActual);
  }, parteEnEspejo !== null);
}
