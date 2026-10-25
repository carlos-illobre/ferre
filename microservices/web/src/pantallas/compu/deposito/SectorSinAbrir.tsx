import type { Sector } from "../../../negocio/deposito";
import { fecha } from "../../../formato";
import { Boton, Progreso } from "../base/ui";
import { plural } from "./deposito-comun";
import css from "./Contar.module.css";

// El sector elegido sin un conteo abierto: cuántos productos tiene, cuándo se contó y el botón
// para empezar (o retomar) el conteo.
type Props = { sector: Sector; abriendo: string | null; enLinea: boolean; alAbrir: () => void };

export function SectorSinAbrir({ sector: s, abriendo, enLinea, alAbrir }: Props) {
  return (
    <div className={css.sinAbrir}>
      <h2>{s.nombre}</h2>
      <p className="detalle">{plural(Number(s.productos), "producto", "productos")} · {s.ultimo_conteo ? `contado por última vez el ${fecha(s.ultimo_conteo)}` : "nunca se contó"}</p>
      {abriendo === s.id ? <Progreso texto="Abriendo el conteo…" /> : (
        <Boton variante="principal" tam="grande" icono="contar" disabled={!enLinea || abriendo !== null} onClick={alAbrir} data-testid="abrir-sector" aria-label={`${s.conteo_abierto ? "Retomar el conteo de" : "Contar"} ${s.nombre}`}>
          {s.conteo_abierto ? "Retomar el conteo" : "Empezar a contar"}
        </Boton>
      )}
      <p className="detalle">Se cuenta de a un producto: lo buscás o lo escaneás, ponés cuántas hay y pasás al siguiente. Al cerrar el sector, las diferencias contra el sistema se ajustan solas.</p>
    </div>
  );
}
