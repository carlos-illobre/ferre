import { irA } from "../rutas";
import { usePuede } from "../../permisos";
import { SECCIONES_DE_NEGOCIO, type SeccionDeNegocio } from "../../pestanas-de-negocio";
import { CabezaDeNegocio } from "./CabezaDeNegocio";
import { DineroInvertido } from "../../DineroInvertido";
import { ComprasRecientes } from "../compras/ComprasRecientes";
import { TEXTOS } from "../../textos";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";
import { QuienYDesdeDonde } from "./QuienYDesdeDonde";
import { SUB_DE_SECCION } from "./sub-de-seccion";
import { VentasDelCelular } from "./VentasDelCelular";
import css from "./Resumen.module.css";


// Más → Cómo va el negocio (decisión 95): las mismas tres secciones que en la computadora, cada
// una con su permiso.
const ICONO_DE_SECCION: Record<SeccionDeNegocio, NombreDeIcono> = { ventas: "chart-column", compras: "truck", inventario: "boxes" };

// Como la v2 («Tablero», decisión 148): las secciones como cuatro botones con ícono (Resultado
// apagado hasta que exista), Hoy · Semana · Mes con el día que compara, «Vendido hoy» grande con
// su comparación y las horas en barras, y cuatro números en grilla. Lo que el sistema todavía no
// sabe queda en su lugar con «—» (021, E02). Compras, como la v2: los gastos con «Ver los gastos»
// y las compras recientes con «Ver las compras», en una sola pantalla.
export function ComoVaElNegocio({ seccion }: { seccion: SeccionDeNegocio }) {
  const actual = SECCIONES_DE_NEGOCIO.find((s) => s.valor === seccion)!;
  return (
    <main className="contenido rc" data-testid={`negocio-${seccion}`}>
      <div className="encabezado">
        <CabezaDeNegocio actual="resumen" />
        <p className="solo-lectores" data-testid="bajada-de-pestana">{actual.bajada.corto}</p>
      </div>
      <Secciones seccion={seccion} />
      {seccion === "ventas" ? <VentasDelCelular /> : seccion === "compras" ? <ComprasRecientes /> : <DineroInvertido />}
      <QuienYDesdeDonde />
    </main>
  );
}

function Secciones({ seccion }: { seccion: SeccionDeNegocio }) {
  const puedeEsto = usePuede();
  const visibles = SECCIONES_DE_NEGOCIO.filter((s) => puedeEsto(...s.pide));
  if (visibles.length <= 1) return null;
  return (
    <nav className={css.secciones} aria-label="Secciones">
      {visibles.map((s) => (
        <button key={s.valor} type="button" className={`${css.sec} ${s.valor === seccion ? "elegida" : ""}`} aria-current={s.valor === seccion ? "page" : undefined} onClick={() => irA(`mas/${SUB_DE_SECCION[s.valor]}`)} data-testid={`seccion-${s.valor}`}>
          <Icono nombre={ICONO_DE_SECCION[s.valor]} tam={22} />{s.nombre}
        </button>
      ))}
      <button type="button" className={css.sec} disabled title={TEXTOS.tablero.sinResultado.corto}><Icono nombre="scale" tam={22} />{TEXTOS.tablero.resultado.corto}</button>
    </nav>
  );
}
