import { useEffect, useRef } from "react";
import { useAccionesDelLugar } from "../../../plataforma/comandos";
import { usePuede } from "../../../negocio/usuarios";
import { TEXTOS } from "../../textos";
import { SECCIONES_DE_NEGOCIO, type SeccionDeNegocio } from "../../pestanas-de-negocio";
import { irA } from "../base/rutas";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";
import css from "./Resumen.module.css";

// Las secciones como segmentos con ícono, cada una con su permiso; Resultado, apagada hasta que
// exista. Con el foco en ellas, se pasa a la de al lado (dando la vuelta) y la nueva recibe el foco.
const RUTA_DE_SECCION: Record<SeccionDeNegocio, string> = { ventas: "resumen", compras: "gastos", inventario: "invertido" };
const ICONO_DE_SECCION: Record<SeccionDeNegocio, NombreDeIcono> = { ventas: "chart-column", compras: "truck", inventario: "boxes" };
let focoEnLasSecciones = false;

export function SeccionesDelNegocio({ seccion }: { seccion: SeccionDeNegocio }) {
  const puedeEsto = usePuede();
  const visibles = SECCIONES_DE_NEGOCIO.filter((s) => puedeEsto(...s.pide));
  const segmentos = useRef<HTMLDivElement>(null);
  const moverse = (paso: number) => () => {
    const i = visibles.findIndex((s) => s.valor === seccion);
    const otra = visibles[(i + paso + visibles.length) % visibles.length];
    if (otra) { focoEnLasSecciones = true; irA(RUTA_DE_SECCION[otra.valor]); }
  };
  useAccionesDelLugar(segmentos, { "secciones.siguiente": moverse(1), "secciones.anterior": moverse(-1) });
  useEffect(() => {
    if (!focoEnLasSecciones) return;
    focoEnLasSecciones = false;
    segmentos.current?.querySelector<HTMLButtonElement>("[aria-current='page']")?.focus();
  }, [seccion]);
  if (visibles.length <= 1) return null;
  return (
    <div className={`${css.segmentos} ${css.secciones}`} role="navigation" aria-label="Secciones" ref={segmentos}>
      {visibles.map((s) => (
        <button key={s.valor} type="button" className={s.valor === seccion ? "elegido" : ""} aria-current={s.valor === seccion ? "page" : undefined} onClick={() => irA(RUTA_DE_SECCION[s.valor])} data-testid={`seccion-${s.valor}`}>
          <Icono nombre={ICONO_DE_SECCION[s.valor]} tam={16} />{s.nombre}
        </button>
      ))}
      <button type="button" disabled title={TEXTOS.tablero.sinResultado.largo}><Icono nombre="scale" tam={16} />{TEXTOS.tablero.resultado.largo}</button>
    </div>
  );
}
