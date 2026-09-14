import { useEffect, useRef, useState } from "react";
import { urlDeFoto } from "../api";

// Foto chica del producto; al tocarla se amplía con la descripción, con la animación de
// View Transitions donde el navegador la tiene (Chrome), y sin animación donde no. En la
// grande hay un botón para sacar (o elegir) una foto nueva desde el celular.
export function FotoProducto({ id, url: urlCruda, descripcion, alSubir }: { id: string; url: string | null; descripcion: string; alSubir?: (archivo: File) => Promise<void> }) {
  const [abierta, setAbierta] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const url = urlDeFoto(urlCruda);
  const nombre = `foto-${id}`;

  async function elegida(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !alSubir) return;
    setSubiendo(true); setError(null);
    try { await alSubir(f); } catch (err) { setError(`No se pudo subir la foto: ${(err as Error).message}`); }
    finally { setSubiendo(false); }
  }

  function cambiar(valor: boolean) {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
    if (doc.startViewTransition) doc.startViewTransition(() => setAbierta(valor));
    else setAbierta(valor);
  }
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") cambiar(false); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  return (
    <>
      <button type="button" className="foto-chica" onClick={(e) => { e.stopPropagation(); cambiar(true); }} title={url ? "Ver la foto grande" : "Sin foto todavía"} data-testid="foto-chica">
        {url ? <img src={url} alt="" style={abierta ? undefined : { viewTransitionName: nombre }} /> : <span className="sin-foto" aria-hidden="true">🧰</span>}
      </button>
      {abierta && (
        <div className="foto-grande-fondo" onClick={() => cambiar(false)} role="dialog" aria-label={descripcion} data-testid="foto-grande">
          <figure className="foto-grande" onClick={(e) => e.stopPropagation()}>
            {url ? <img src={url} alt={descripcion} style={{ viewTransitionName: nombre }} /> : <div className="sin-foto grande" style={{ viewTransitionName: nombre }}>🧰</div>}
            <figcaption>{descripcion}{!url && <><br /><small>Este producto todavía no tiene foto.</small></>}</figcaption>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="acciones">
              {alSubir && (
                <>
                  <input ref={archivo} type="file" accept="image/*" capture="environment" hidden onChange={elegida} data-testid="archivo-foto" />
                  <button type="button" className="grande" disabled={subiendo} onClick={() => archivo.current?.click()} data-testid="sacar-foto">{subiendo ? "Subiendo…" : url ? "📷 Sacar otra foto" : "📷 Sacar foto"}</button>
                </>
              )}
              <button type="button" className="secundario" onClick={() => cambiar(false)}>Cerrar</button>
            </div>
          </figure>
        </div>
      )}
    </>
  );
}
