import { Pestanas } from "../Pestanas";
import { type Permiso } from "../../../negocio/permisos";
import { usePuede } from "../../../negocio/usuarios";
import { SinPermiso } from "../../SinPermiso";
import { irA } from "../rutas";
import { Duplicados } from "./Duplicados";
import { Listas } from "./Listas";
import { Productos } from "./Productos";

// Catálogo: productos con margen y proveedores, listas de precios, duplicados. Tres
// sub-pantallas con un segmento arriba.
const SUB = [{ valor: "productos", nombre: "Productos" }, { valor: "listas", nombre: "Listas" }, { valor: "duplicados", nombre: "Duplicados" }] as const;
type Sub = (typeof SUB)[number]["valor"];
// Lo que pide cada pestaña (RF-72). Buscar productos lo puede cualquiera con sesión.
const PIDE: Partial<Record<Sub, Permiso>> = { listas: "catalogo.listas", duplicados: "catalogo.duplicados" };

export function Catalogo({ sub }: { sub: string | null }) {
  const actual: Sub = sub === "listas" || sub === "duplicados" ? sub : "productos";
  const puedeEsto = usePuede();
  const permitida = (s: Sub) => !PIDE[s] || puedeEsto(PIDE[s]!);
  if (!permitida(actual)) return <SinPermiso falta={[PIDE[actual]!]} />;
  return (
    <main className="contenido">
      <div className="encabezado">
        <h1 className="titulo">Catálogo</h1>
        <Pestanas opciones={SUB.filter((s) => permitida(s.valor)).map((s) => ({ valor: s.valor, nombre: s.nombre, icono: s.valor }))} actual={actual} alElegir={(v) => irA(v === "productos" ? "catalogo" : `catalogo/${v}`)} />
      </div>
      {actual === "productos" ? <Productos /> : actual === "listas" ? <Listas /> : <Duplicados />}
    </main>
  );
}
