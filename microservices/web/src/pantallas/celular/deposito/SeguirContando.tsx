import type { Conteo, Sector } from "../../../negocio/deposito";
import { fecha } from "../../../formato";
import { TEXTOS } from "../../textos";
import { Icono } from "../componentes/base";
import css from "./Contar.module.css";

// El conteo a medias: arriba, con su avance en un anillo y cuánto falta; abajo, al pulgar, escanear
// y «Seguir contando».
const tc = TEXTOS.contar;

export function SeguiDondeQuedaste({ sector, retomable, avance, alAbrir }: { sector: Sector; retomable: Conteo | null; avance: number; alAbrir: () => void }) {
  return (
    <button type="button" className={css.seguir} onClick={alAbrir} data-testid="segui-donde-quedaste">
      <span className={css.anillo} style={{ background: `conic-gradient(var(--p-naranja) ${avance * 360}deg, var(--p-relleno) 0)` }}><span>{retomable ? `${Math.round(avance * 100)}%` : "—"}</span></span>
      <span className={css.seguirTexto}><em><Icono nombre="pause" tam={16} />{tc.seguiDondeQuedaste.corto}</em><b>{sector.nombre}</b>
        <span>{retomable ? `Faltan ${retomable.sin_contar.length}${retomable.abierto_en ? ` · abierto el ${fecha(retomable.abierto_en).slice(0, 5)}` : ""}` : `${sector.productos} productos`}</span></span>
    </button>
  );
}

export function SeguirContando({ sector, alAbrir }: { sector: Sector; alAbrir: () => void }) {
  return (
    <div className={css.pie}>
      <button type="button" className={css.escanear} onClick={alAbrir} aria-label={`Escanear en ${sector.nombre}`}><Icono nombre="scan-barcode" tam={26} /></button>
      <button type="button" className={css.seguirBoton} onClick={alAbrir} data-testid="seguir-contando">{tc.seguirContando.corto}<Icono nombre="arrow-right" /></button>
    </div>
  );
}
