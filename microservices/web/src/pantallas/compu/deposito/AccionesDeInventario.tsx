import { TEXTOS } from "../../textos";
import { AlLadoDeLasPestanas } from "../../AlLadoDeLasPestanas";
import { irA } from "../base/rutas";
import { Boton } from "../base/ui";
import { Icono } from "../../../ui/iconos";
import css from "./Inventario.module.css";

// Al lado de las pestañas: exportar y etiquetas (todavía no) y «Qué pedir», si arma pedidos.
const t = TEXTOS.stock;

export function AccionesDeInventario({ pidePedidos }: { pidePedidos: boolean }) {
  return (
    <AlLadoDeLasPestanas>
      <div className={css.acciones}>
        <Boton tam="chico" disabled title={t.todaviaNo.largo} data-testid="exportar-excel"><Icono nombre="file-spreadsheet" tam={16} />{t.exportar.largo}</Boton>
        <Boton tam="chico" disabled title={t.todaviaNo.largo} data-testid="etiquetas"><Icono nombre="printer" tam={16} />{t.etiquetas.largo} <kbd className="tecla">Alt E</kbd></Boton>
        {pidePedidos && <Boton tam="chico" variante="principal" className={css.quePedir} onClick={() => irA("pedidos")} data-testid="que-pedir"><Icono nombre="truck" tam={16} />{t.quePedir.largo} · — </Boton>}
      </div>
    </AlLadoDeLasPestanas>
  );
}
