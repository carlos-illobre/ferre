import { useRef } from "react";
import { useSubirFoto } from "../../comun/catalogo/useSubirFoto";
import type { Producto } from "../../../negocio/catalogo";
import { TEXTOS } from "../../textos";
import { Icono } from "../componentes/base";
import { FotoProducto } from "../componentes/Foto";
import css from "./Ficha.module.css";

const t = TEXTOS.ficha;

// La foto grande (tocarla la amplía, como siempre) con «Cambiar foto» encima; sin foto, un lugar
// neutro con «Sacar foto».
export function FotoDeLaFicha({ producto: p, alSubir, stock }: { producto: Producto; alSubir: (archivo: File) => Promise<void>; stock: React.ReactNode }) {
  const archivo = useRef<HTMLInputElement>(null);
  const { subiendo, error, elegida } = useSubirFoto(alSubir, (m) => `${t.noSubio.corto}: ${m}`);
  return (
    <div className={`ficha-foto ${css.hero} ${p.foto_url ? "" : "sin"}`}>
      {stock}
      <FotoProducto id={p.id} url={p.foto_url ?? null} descripcion={p.descripcion} alSubir={alSubir} />
      <input ref={archivo} type="file" accept="image/*" capture="environment" hidden onChange={elegida} data-testid="archivo-foto-ficha" />
      <button type="button" className="ficha-cambiar-foto" disabled={subiendo} onClick={() => archivo.current?.click()} data-testid="cambiar-foto">
        <Icono nombre="camara" tam={16} />{subiendo ? t.subiendo.corto : p.foto_url ? t.cambiarFoto.corto : t.sacarFoto.corto}
      </button>
      {error && <p className="ficha-foto-error" role="alert">{error}</p>}
    </div>
  );
}

