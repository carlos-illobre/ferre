import { irA } from "../rutas";
import { usePuede, usePuedeAnular } from "../../../negocio/usuarios";
import { SinPermiso } from "../../SinPermiso";
import { EstadoDeConexion } from "../componentes/EstadoDeConexion";
import { VentasDelDia } from "./VentasDelDia";
import { Pestanas } from "../Pestanas";
import { PIDE } from "./permisos-de-vender";
import { Vender } from "./Vender";
import css from "./Vender.module.css";

// Vender tiene dos pestañas en el celular (decisión 120): armar la venta, y las ventas del día,
// desde donde también se anula.
const SUB = [{ valor: "vender", nombre: "Vender", icono: "vender" }, { valor: "hoy", nombre: "Ventas del día", icono: "ventas" }] as const;
type Sub = (typeof SUB)[number]["valor"];

// «vender/anular» era la pestaña de anular, que ahora está en «Ventas de hoy».
function pestanaActual(sub: string | null, permitidas: typeof SUB[number][]): Sub {
  const pedida = sub === "anular" ? "hoy" : sub;
  return SUB.find((s) => s.valor === pedida)?.valor ?? permitidas[0]?.valor ?? "vender";
}

export function ParteVender({ sub }: { sub: string | null }) {
  const puede = usePuede();
  const anula = usePuedeAnular();
  const permitidas = SUB.filter((s) => puede(...PIDE[s.valor]));
  const actual = pestanaActual(sub, permitidas);
  // Con una sola pestaña a la vista no se dibujan.
  const pestanas = permitidas.length > 1 ? <Pestanas opciones={[...permitidas]} actual={actual} alElegir={(v) => irA(v === "vender" ? "vender" : `vender/${v}`)} /> : null;
  if (!puede(...PIDE[actual])) return <SinPermiso falta={PIDE[actual]} />;
  if (actual === "vender") return <Vender pestanas={pestanas} />;
  return (
    <main className={`contenido ${css.pantalla}`}>
      <div className="encabezado"><h1 className="titulo">Vender</h1><EstadoDeConexion testId="conexion-vender" />{pestanas}</div>
      <VentasDelDia anulaHoy={anula.hoy} anulaCualquierDia={anula.cualquierDia} />
    </main>
  );
}
