import type { NombreDeIcono } from "./compu/base/ui";
import type { Permiso } from "./permisos";
import { NOMBRES } from "./textos";

// Más → Anomalías (014): dos pestañas, igual en el celular y en la computadora. Primero «Para
// revisar», lo apartado de alguien a quien desactivaron, con «Administrar usuarios»; después
// «Anotadas», las anomalías de siempre, con su permiso. La opción de Más se ve con cualquiera de
// los dos y abre la primera que se ve.
export type PestanaDeAnomalias = "para-revisar" | "anomalias";
export const PESTANAS_DE_ANOMALIAS: { valor: PestanaDeAnomalias; nombre: string; icono: NombreDeIcono; pide: Permiso[] }[] = [
  { valor: "para-revisar", nombre: NOMBRES.paraRevisar, icono: "bandeja", pide: ["admin.usuarios"] },
  { valor: "anomalias", nombre: NOMBRES.anotadas, icono: "alerta", pide: ["negocio.anomalias"] },
];
export const PIDE_LAS_ANOMALIAS: Permiso[] = PESTANAS_DE_ANOMALIAS.flatMap((p) => p.pide);
