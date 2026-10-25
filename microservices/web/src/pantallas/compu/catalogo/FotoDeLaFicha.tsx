import { useRef } from "react";
import { useSubirFoto } from "../../comun/catalogo/useSubirFoto";
import type { Producto } from "../../../negocio/catalogo";
import { TEXTOS } from "../../textos";
import { FotoProducto, Icono } from "../base/ui";

// La foto de la ficha, con «Cambiar foto» (o «Subir foto», sin foto); si no se puede subir, lo dice.
const t = TEXTOS.ficha;

export function FotoDeLaFicha({ producto: p, alSubir, alError }: { producto: Producto; alSubir: (archivo: File) => Promise<void>; alError: (m: string) => void }) {
  const archivo = useRef<HTMLInputElement>(null);
  const { subiendo, elegida } = useSubirFoto(alSubir, (m) => `${t.noSubio.largo}: ${m}`, alError);
  return (
    <div className={`ficha-foto ${p.foto_url ? "" : "sin"}`}>
      <FotoProducto id={p.id} url={p.foto_url ?? null} descripcion={p.descripcion} alSubir={alSubir} />
      <input ref={archivo} type="file" accept="image/*" hidden onChange={elegida} data-testid="archivo-foto-ficha" />
      <button type="button" className="ficha-cambiar-foto" disabled={subiendo} onClick={() => archivo.current?.click()} data-testid="cambiar-foto">
        <Icono nombre="camara" tam={16} />{subiendo ? t.subiendo.largo : p.foto_url ? t.cambiarFoto.largo : t.sacarFoto.largo}
      </button>
    </div>
  );
}
