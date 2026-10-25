import type { Item } from "../../../negocio/ventas";
import { Atajo, Icono } from "../base/ui";
import { useEtiqueta } from "../../../plataforma/comandos";
import { Boleta } from "./Boleta";
import { DeDondeSale } from "./DeDondeSale";
import type { Panel } from "./usePanel";
import css from "./PanelDeLaVenta.module.css";

// El panel de la derecha (decisión 122): «De dónde sale» o la boleta. Oculto, una pestaña al
// costado derecho lo vuelve a abrir (Carlos, 2026-10-19).
export function PanelDeLaVenta({ panel, renglon, items, total }: { panel: Panel; renglon: Item | null; items: Item[]; total: number }) {
  const tecla = useEtiqueta("vender.panel");
  const conTecla = tecla ? ` (${tecla})` : "";
  if (!panel.visible) {
    return (
      <button type="button" className={css.abrir} onClick={() => panel.ver(true)} aria-keyshortcuts={tecla} title={`Mostrar el panel${conTecla}`} data-testid="abrir-panel">
        <Icono nombre="izquierda" tam={18} /><span>De dónde sale · Boleta</span><Atajo accion="vender.panel" kbd />
      </button>
    );
  }
  const boleta = panel.pestana === "boleta";
  return (
    <aside className={`${css.panel} ${boleta ? css.conBoleta : ""}`} aria-label="Panel de la venta" data-testid="panel">
      <div className={css.cab} role="tablist">
        <button type="button" role="tab" aria-selected={!boleta} onClick={() => panel.setPestana("donde")} data-testid="panel-donde"><Icono nombre="calculadora" tam={16} />De dónde sale</button>
        <button type="button" role="tab" aria-selected={boleta} onClick={() => panel.setPestana("boleta")} data-testid="panel-boleta"><Icono nombre="archivo" tam={16} />Boleta</button>
        <button type="button" className={css.ocultar} onClick={() => panel.ver(false)} aria-label="Ocultar el panel" title={`Ocultar el panel${conTecla}`} aria-keyshortcuts={tecla} data-testid="ocultar-panel"><Icono nombre="ocultar-panel" tam={20} grosor={1.9} /></button>
      </div>
      <div className={css.cuerpo} role="tabpanel">{boleta ? <Boleta items={items} total={total} /> : <DeDondeSale item={renglon} />}</div>
    </aside>
  );
}
