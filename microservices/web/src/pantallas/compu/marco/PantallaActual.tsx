import type { ReactNode } from "react";
import { pantallaDeCompras } from "../../../negocio/compras";
import type { UsuarioDeLaSesion } from "../../../negocio/usuarios";
import { Pedidos } from "../../comun/deposito/Pedidos";
import { irA } from "../base/rutas";
import { VentasDelDia } from "../ventas/VentasDelDia";
import { Productos } from "../catalogo/Productos";
import { Listas } from "../catalogo/Listas";
import { Duplicados } from "../catalogo/Duplicados";
import { Inventario } from "../deposito/Inventario";
import { DineroInvertido } from "../../DineroInvertido";
import { Ingreso } from "../deposito/Ingreso";
import { Configuracion } from "../configuracion/Configuracion";
import { PantallaDeProcesos } from "../../comun/procesos/Procesos";
import { ComprasRecientes } from "../compras/ComprasRecientes";
import { Contar } from "../deposito/Contar";
import { ResumenCompras, ResumenInventario, ResumenVentas } from "../negocio/Resumen";
import { Usuarios } from "../negocio/Usuarios";
import { Sistema } from "../../comun/sistema/Sistema";
import { Actividad } from "../negocio/Actividad";
import { Vender } from "../ventas/Vender";
import { Mas } from "./Mas";
import { puede } from "../../../negocio/usuarios";
import { SinPermiso } from "../../SinPermiso";
import { Roles } from "../../comun/negocio/Roles";
import { Tickets } from "../tickets/Tickets";
import { Anotadas } from "../anomalias/Anotadas";
import { ParaRevisar } from "../anomalias/ParaRevisar";
import type { MenuDeLaPersona } from "./useMenu";

type Contexto = { usuario: UsuarioDeLaSesion | null; m: MenuDeLaPersona; conPestanas: boolean };
const pedidos = () => <main id="contenido" className="pagina" tabIndex={-1}><Pedidos alIngresar={(id) => irA(`ingreso?pedido=${id}`)} /></main>;

// Compras, como la v2: el escritorio de las compras, o el ingreso o los pedidos (decisión 153).
function compras({ usuario }: Contexto) {
  return { escritorio: <main id="contenido" className="pagina pagina-compras" tabIndex={-1}><ComprasRecientes /></main>, ingreso: <Ingreso />, pedidos: pedidos() }[pantallaDeCompras((...p) => puede(usuario, ...p))];
}

// Cada dirección con su pantalla; la que no está, Vender.
const PANTALLAS: Record<string, (c: Contexto) => ReactNode> = {
  mas: ({ m }) => <Mas accionDe={m.accionDe} opciones={m.deMas} />,
  roles: () => <Roles />,
  pedidos,
  hoy: () => <VentasDelDia />, productos: () => <Productos />, ingreso: () => <Ingreso />,
  compras,
  stock: () => <Inventario />, listas: () => <Listas />, duplicados: () => <Duplicados />,
  contar: () => <Contar />, resumen: () => <ResumenVentas />,
  gastos: () => <ResumenCompras recientes={(vuelta) => <ComprasRecientes key={`recientes-${vuelta}`} />} />,
  invertido: () => <ResumenInventario invertido={(vuelta) => <DineroInvertido key={vuelta} />} />,
  usuarios: ({ usuario }) => (puede(usuario, "admin.usuarios") ? <Usuarios /> : <Roles />),
  actividad: () => <Actividad />, tickets: () => <Tickets />, configuracion: () => <Configuracion />, sistema: () => <Sistema />,
  procesos: () => <PantallaDeProcesos interfaz="compu" />,
  anomalias: ({ conPestanas }) => <Anotadas titulo={!conPestanas} />,
  "para-revisar": ({ conPestanas }) => <ParaRevisar titulo={!conPestanas} />,
};

export function PantallaActual({ actual, ...c }: Contexto & { actual: string }) {
  if (c.m.falta) return <SinPermiso falta={c.m.falta} />;
  return <>{(PANTALLAS[actual] ?? (() => <Vender />))(c)}</>;
}
