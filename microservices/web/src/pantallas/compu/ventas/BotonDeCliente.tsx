import type { Cliente } from "../../../negocio/catalogo";
import { Atajo, Icono } from "../base/ui";
import { useEtiqueta } from "../../../plataforma/comandos";
import css from "./BotonDeCliente.module.css";

// El cliente de la venta: ocupa todo lo que queda de la barra (Carlos, 2026-10-19). Elegido,
// con sus iniciales; con cuenta corriente y sin elegir, en ámbar.
const iniciales = (nombre: string) => nombre.split(/\s+/).filter((x) => /^[A-ZÁÉÍÓÚÑ]/i.test(x)).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("");

export function BotonDeCliente({ cliente, falta, alElegir }: { cliente: Cliente | undefined; falta: boolean; alElegir: () => void }) {
  const clase = cliente ? css.elegido : falta ? css.falta : "";
  const tecla = useEtiqueta("vender.cliente");
  return (
    <button type="button" className={`${css.cliente} ${clase}`} onClick={alElegir} aria-keyshortcuts={tecla} data-testid="cliente">
      {cliente ? <span className={css.iniciales} aria-hidden="true">{iniciales(cliente.nombre)}</span> : <Icono nombre="usuarios" tam={16} />}
      <span>{cliente ? cliente.nombre : falta ? "Elegí el cliente" : "Cliente"}</span><Atajo accion="vender.cliente" kbd />
    </button>
  );
}
