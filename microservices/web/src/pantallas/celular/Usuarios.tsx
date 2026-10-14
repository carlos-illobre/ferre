import { irA } from "../../rutas";
import { usePuede } from "../permisos";
import { PESTANAS_DE_USUARIOS, type PestanaDeUsuarios } from "../pestanas-de-usuarios";
import { NOMBRES, TEXTOS } from "../textos";
import { Pestanas } from "./Pestanas";

// El encabezado de Más → Usuarios (decisión 88): el título y las pestañas que la persona puede
// ver, como en Depósito. Cada pestaña dibuja su contenido debajo.
export function CabezaDeUsuarios({ actual }: { actual: PestanaDeUsuarios }) {
  const puedeEsto = usePuede();
  const visibles = PESTANAS_DE_USUARIOS.filter((p) => puedeEsto(...(p.pide ?? [])));
  const bajada = actual === "usuarios" ? TEXTOS.usuarios.pestanaUsuarios.corto : actual === "sesiones" ? TEXTOS.usuarios.pestanaSesiones.corto : null;
  return (
    <>
      <h1 className="titulo">{NOMBRES.usuarios}</h1>
      {visibles.length > 1 && <Pestanas opciones={visibles.map((p) => ({ valor: p.valor, nombre: p.corto, icono: p.icono }))} actual={actual} alElegir={(v) => irA(`mas/${v}`)} />}
      {bajada && <p className="bajada-de-pestana" data-testid="bajada-de-pestana">{bajada}</p>}
    </>
  );
}
