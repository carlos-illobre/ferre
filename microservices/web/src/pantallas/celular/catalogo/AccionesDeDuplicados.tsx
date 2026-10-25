import { TEXTOS } from "../../textos";
import { Icono } from "../componentes/base";
import css from "./Duplicados.module.css";

// La nota de qué es unir y los tres botones: buscar en todo, unir dos a mano y separar una unión.
type Props = { alBuscar: () => void; alUnirAMano: () => void; alVerUnidos: () => void };

export function AccionesDeDuplicados({ alBuscar, alUnirAMano, alVerUnidos }: Props) {
  const t = TEXTOS.duplicados;
  return (
    <>
      <div className={css.nota}>
        <Icono nombre="unir" tam={18} />
        <span>{t.nota.corto} <b>{t.notaFuerte.corto}</b>{t.notaFin.corto}</span>
      </div>
      <div className={css.tres}>
        <div><button type="button" className={`${css.boton} oscuro`} onClick={alBuscar} data-testid="buscar-duplicados"><Icono nombre="buscar" tam={18} />{t.buscarEnTodo.corto}</button><span>Todo el catálogo</span></div>
        <div><button type="button" className={css.boton} onClick={alUnirAMano} data-testid="unir-a-mano"><Icono nombre="unir" tam={18} />{t.unirAMano.corto}</button><span>Dos, a mano</span></div>
        <div><button type="button" className={css.boton} onClick={alVerUnidos} data-testid="separar-uno"><Icono nombre="dividir" tam={18} />{t.unidosYSeparar.corto}</button><span>Una unión</span></div>
      </div>
    </>
  );
}
