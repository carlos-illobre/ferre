import { irA } from "../../rutas";
import { usePuede } from "../permisos";
import { PIDE_EL_NEGOCIO, SECCIONES_DE_NEGOCIO } from "../pestanas-de-negocio";
import { type PestanaDeUsuarios } from "../pestanas-de-usuarios";
import { NOMBRES, TEXTOS } from "../textos";
import { SUB_DE_SECCION } from "./ComoVaElNegocio";
import { Pestanas } from "./Pestanas";

// El encabezado de la parte Negocio, como la v2 (decisión 148): el título y las pestañas Resumen ·
// Usuarios · Actividad que la persona puede ver. Cada pantalla dibuja su contenido debajo. Roles no
// es pestaña: es un botón dentro de Usuarios.
type PestanaDeNegocio = "resumen" | "usuarios" | "actividad";
export function CabezaDeNegocio({ actual }: { actual: PestanaDeNegocio | PestanaDeUsuarios }) {
  const puedeEsto = usePuede();
  const elegida: PestanaDeNegocio = actual === "roles" ? "usuarios" : actual;
  const primeraSeccion = SECCIONES_DE_NEGOCIO.find((s) => puedeEsto(...s.pide))?.valor ?? "ventas";
  const opciones = [
    { valor: "resumen" as const, nombre: NOMBRES.resumen, icono: "resumen" as const, ve: puedeEsto(...PIDE_EL_NEGOCIO), destino: `mas/${SUB_DE_SECCION[primeraSeccion]}` },
    { valor: "usuarios" as const, nombre: NOMBRES.usuarios, icono: "usuarios" as const, ve: puedeEsto("admin.usuarios", "admin.roles"), destino: puedeEsto("admin.usuarios") ? "mas/usuarios" : "mas/roles" },
    { valor: "actividad" as const, nombre: NOMBRES.actividad, icono: "actividad" as const, ve: puedeEsto("negocio.actividad"), destino: "mas/actividad" },
  ].filter((o) => o.ve);
  const bajada = actual === "usuarios" ? TEXTOS.usuarios.pestanaUsuarios.corto : null;
  return (
    <>
      <h1 className="titulo">{NOMBRES.negocio}</h1>
      {opciones.length > 1 && <Pestanas opciones={opciones.map(({ valor, nombre, icono }) => ({ valor, nombre, icono }))} actual={elegida} alElegir={(v) => irA(opciones.find((o) => o.valor === v)!.destino)} />}
      {elegida === "usuarios" && puedeEsto("admin.usuarios") && puedeEsto("admin.roles") && (
        <div className="negocio-roles">
          {actual === "roles"
            ? <button type="button" className="boton chico" onClick={() => irA("mas/usuarios")} data-testid="volver-a-usuarios">{NOMBRES.usuarios}</button>
            : <button type="button" className="boton chico" onClick={() => irA("mas/roles")} data-testid="roles-y-permisos">{NOMBRES.rolesYPermisos}</button>}
        </div>
      )}
      {bajada && <p className="bajada-de-pestana" data-testid="bajada-de-pestana">{bajada}</p>}
    </>
  );
}
