import { pantallaDeCompras } from "../../../negocio/compras";
import { Pedidos } from "../../comun/deposito/Pedidos";
import { usePuede, type Permiso } from "../../permisos";
import { SinPermiso } from "../../SinPermiso";
import { irA } from "../../../rutas";
import { Pestanas } from "../Pestanas";
import { ComprasRecientes } from "../compras/ComprasRecientes";
import { Contar } from "./Contar";
import { Ingreso } from "./Ingreso";
import { Stock } from "./Stock";

// Depósito: inventario (cantidades, sin dinero), ingreso de mercadería y conteo por sector. Tres
// sub-pantallas con un segmento arriba (rediseño en mockups/Ferre iOS.html).
// Como la v2 (decisión 148): Stock · Compras · Contar. Compras abre el Ingreso y los Pedidos, que no
// tienen pestaña: se ven con «Compras» marcada.
const SUB = [{ valor: "stock", nombre: "Stock" }, { valor: "compras", nombre: "Compras" }, { valor: "contar", nombre: "Contar" }] as const;
type Sub = (typeof SUB)[number]["valor"] | "ingreso" | "pedidos";
// Lo que pide cada pantalla (RF-72). El stock lo ve cualquiera con sesión.
const PIDE: Partial<Record<Sub, Permiso[]>> = { compras: ["negocio.gastos", "deposito.compras", "deposito.ingresos", "deposito.pedidos"], pedidos: ["deposito.pedidos", "deposito.ingresos"], ingreso: ["deposito.ingresos"], contar: ["deposito.stock"] };
const TODAS: Sub[] = ["stock", "compras", "contar", "ingreso", "pedidos"];

export function Deposito({ sub }: { sub: string | null }) {
  const puedeEsto = usePuede();
  const permitida = (s: Sub) => puedeEsto(...(PIDE[s] ?? []));
  // Al entrar a Depósito desde el menú se abre siempre la primera pestaña que la persona puede
  // usar (decisión 56); las demás se eligen arriba.
  const actual: Sub = TODAS.find((s) => s === sub) ?? SUB.find((s) => permitida(s.valor))?.valor ?? "stock";
  const pestana = actual === "ingreso" || actual === "pedidos" ? "compras" : actual;
  if (!permitida(actual)) return <SinPermiso falta={PIDE[actual]!} />;
  return (
    <main className="contenido">
      <div className="encabezado">
        <h1 className="titulo">Depósito</h1>
        <Pestanas opciones={SUB.filter((s) => permitida(s.valor)).map((s) => ({ valor: s.valor, nombre: s.nombre, icono: s.valor }))} actual={pestana} alElegir={(v) => irA(`deposito/${v}`)} />
      </div>
      <LaPantalla actual={actual} />
    </main>
  );
}


const LosPedidos = () => <Pedidos celular alIngresar={(id) => irA(`deposito/ingreso?pedido=${id}`)} />;
// Compras es el escritorio de compras, o el ingreso o los pedidos, según lo que se pueda (decisión 153).
function LasCompras() {
  const cual = pantallaDeCompras(usePuede());
  return cual === "escritorio" ? <ComprasRecientes /> : cual === "ingreso" ? <Ingreso /> : <LosPedidos />;
}
const PANTALLAS: Record<Sub, () => JSX.Element> = { stock: Stock, compras: LasCompras, contar: Contar, ingreso: Ingreso, pedidos: LosPedidos };
function LaPantalla({ actual }: { actual: Sub }) {
  const Pantalla = PANTALLAS[actual];
  return <Pantalla />;
}
