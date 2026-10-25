import { irA } from "../rutas";
import { useParaRevisar } from "../../../negocio/apartados";
import { usePuede } from "../../../negocio/usuarios";
import { PESTANAS_DE_ANOMALIAS, type PestanaDeAnomalias } from "../../pestanas-de-anomalias";
import { NOMBRES } from "../../textos";
import { Pestanas } from "../Pestanas";

// El encabezado de Más → Anomalías (014): el título y las pestañas que la persona puede ver,
// primero «Para revisar» con la cantidad pendiente a la derecha. Cada pestaña dibuja su
// contenido debajo.
export function CabezaDeAnomalias({ actual }: { actual: PestanaDeAnomalias }) {
  const puedeEsto = usePuede();
  const visibles = PESTANAS_DE_ANOMALIAS.filter((p) => puedeEsto(...p.pide));
  const cuantos = useParaRevisar(puedeEsto("admin.usuarios")).datos?.apartados.length ?? 0;
  return (
    <>
      <h1>{NOMBRES.anomalias}</h1>
      {visibles.length > 1 && <Pestanas opciones={visibles.map((p) => ({ valor: p.valor, nombre: p.nombre, icono: p.icono, cuenta: p.valor === "para-revisar" ? cuantos : 0 }))} actual={actual} alElegir={(v) => irA(`mas/${v}`)} />}
    </>
  );
}
