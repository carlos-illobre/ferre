import { TEXTOS } from "../../textos";
import { AlLadoDeLasPestanas } from "../../AlLadoDeLasPestanas";
import { irA } from "../base/rutas";
import { Boton } from "../base/ui";
import { Icono } from "../../../ui/iconos";
import css from "./Compras.module.css";

// Al lado de las pestañas: armar un pedido (Alt P) y registrar una compra (Alt N).
const t = TEXTOS.compras;

export function AccionesDeCompras({ encarga, registra }: { encarga: boolean; registra: boolean }) {
  return (
    <AlLadoDeLasPestanas>
      <div className={css.acciones}>
        {encarga && <Boton tam="chico" onClick={() => irA("pedidos")} data-testid="armar-pedido"><Icono nombre="send" tam={16} />{t.armarPedido.largo} <kbd className="tecla">Alt P</kbd></Boton>}
        {registra && <Boton tam="chico" variante="principal" className={css.registrar} onClick={() => irA("ingreso")} data-testid="registrar-compra"><Icono nombre="camera" tam={16} />{t.registrarCompra.largo} <kbd className="tecla">Alt N</kbd></Boton>}
      </div>
    </AlLadoDeLasPestanas>
  );
}
