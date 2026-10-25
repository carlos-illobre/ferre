import { api } from "../../datos/conexion";
import { consultas } from "../../datos/conexion";
import { useDelServidor } from "../del-servidor";
import { vistaDelCambio } from "./vista-del-cambio";
import type { CambioApartado, CambiosParaRevisar } from "@servidor/apartados";

// Lo apartado de alguien a quien desactivaron (specs/014-cambios-apartados): lo que hizo sin
// conexión y no llegó al servidor. No cuenta para nada hasta que alguien con «Administrar
// usuarios» lo acepta; aceptado, queda a nombre de quien lo hizo. Una sola vez para el celular y
// la computadora: qué hay, cómo se cuenta cada cambio y cómo se decide.
export type { CambioApartado };
const CLAVE = ["apartados"] as const;

export function useParaRevisar(activo = true) {
  return useDelServidor<CambiosParaRevisar>(CLAVE, "/apartados", { activo });
}

// Aceptar o descartar uno. Si sale bien, la lista se vuelve a pedir y el cambio se va. Si no,
// el error dice por qué (lo dice el servidor: no se pudo aplicar, u otra persona ya lo decidió) y
// la lista no se vuelve a pedir: la tarjeta queda con el motivo a la vista hasta que se actualice.
export async function decidir(id: string, decision: "aceptar" | "descartar"): Promise<void> {
  await api(`/apartados/${id}/${decision}`, { method: "POST" });
  await consultas.invalidateQueries({ queryKey: CLAVE });
}

// De a una persona, en el orden en que llegaron sus cambios.
export type DeUnaPersona = { usuario_id: string; usuario: string; desactivado_en: string | null; dispositivo: string | null; cambios: CambioApartado[] };
export function porPersona(lista: CambioApartado[]): DeUnaPersona[] {
  const grupos = new Map<string, DeUnaPersona>();
  for (const c of lista) {
    const g = grupos.get(c.usuario_id) ?? { usuario_id: c.usuario_id, usuario: c.usuario, desactivado_en: c.desactivado_en, dispositivo: c.dispositivo, cambios: [] };
    g.cambios.push(c);
    grupos.set(c.usuario_id, g);
  }
  return [...grupos.values()];
}

// Los cuatro números de arriba de la bandeja.
export function resumenDeLoApartado(lista: CambioApartado[]) {
  const ventas = lista.filter((c) => c.tipo === "venta");
  const plata = ventas.reduce((s, c) => s + (vistaDelCambio(c, () => undefined).importe ?? 0), 0);
  const masViejo = lista.reduce<string | null>((m, c) => (!m || c.hecho_en < m ? c.hecho_en : m), null);
  return { cambios: lista.length, ventas: ventas.length, plata, personas: new Set(lista.map((c) => c.usuario_id)).size, masViejo };
}

// Después de decidir uno, queda elegido el siguiente; si era el último, el anterior.
export function elQueSigue<C extends { id: string }>(orden: C[], c: C): string | null {
  const i = orden.indexOf(c);
  return orden[i + 1]?.id ?? orden[i - 1]?.id ?? null;
}
export const cuantosProductos = (n: number) => (n === 1 ? "1 producto" : `${n} productos`);
// El importe con los miles separados por punto, sin el signo: lo pone la pantalla, más chico.
export const enMiles = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
