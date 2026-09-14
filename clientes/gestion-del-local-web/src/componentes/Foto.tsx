import { useEffect, useState } from "react";

// Foto chica del producto; al tocarla se amplía con la descripción, con la animación de
// View Transitions donde el navegador la tiene (Chrome), y sin animación donde no.
export function FotoProducto({ id, url, descripcion }: { id: string; url: string | null; descripcion: string }) {
  const [abierta, setAbierta] = useState(false);
  const nombre = `foto-${id}`;

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
            <button type="button" className="secundario" onClick={() => cambiar(false)}>Cerrar</button>
          </figure>
        </div>
      )}
    </>
  );
}
