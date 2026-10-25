import { pedir, useComandos, type Acciones } from "../../../plataforma/comandos";
import { hayUnaVentanaAbierta } from "../base/ui";
import type { Inventario } from "./useInventario";

// Lo que ofrece Inventario: ir a la búsqueda, ir a «¿Cuántas hay?» del elegido y elegir el de al
// lado (arriba del primero están las pestañas, decisión 82, salvo con el cursor en la búsqueda: no
// la saca de la caja, decisiones 130 y 133). Con el foco en la corrección, elegir otro no aplica.
// Devuelve lo de la búsqueda: elegir el de al lado, ir a corregir el elegido y limpiarla.
const aCorregir = (x: Inventario) => x.panel.current?.querySelector<HTMLInputElement>("[data-testid='cantidad-real']")?.focus();
const enElPanel = (x: Inventario) => Boolean(x.panel.current?.contains(document.activeElement));

function mover(x: Inventario, paso: 1 | -1, conPestanas: boolean) {
  if (!x.filas.length || enElPanel(x)) return false;
  if (paso === 1) { x.setElegidoId(x.filas[Math.min(x.marcada + 1, x.filas.length - 1)]!.id); return; }
  if (x.marcada > 0) x.setElegidoId(x.filas[x.marcada - 1]!.id);
  else if (conPestanas) pedir("pestanas.enfocar");
}

export function useAccionesDeInventario(x: Inventario): Acciones {
  const libre = (hacer: () => boolean | void) => () => (hayUnaVentanaAbierta() ? false : hacer());
  useComandos({
    "inventario.buscar": libre(() => x.caja.current?.focus()),
    "inventario.corregir": libre(() => (x.corrige && x.elegido ? aCorregir(x) : false)),
    "inventario.siguiente": libre(() => mover(x, 1, true)),
    "inventario.anterior": libre(() => mover(x, -1, true)),
  });
  return {
    "lista.siguiente": libre(() => mover(x, 1, false)),
    "lista.anterior": libre(() => mover(x, -1, false)),
    "lista.elegir": libre(() => (x.elegido ? aCorregir(x) : false)),
    "lista.salir": libre(() => (x.consulta ? x.setConsulta("") : false)),
  };
}
