import { useRef, useState } from "react";
import { useComandos } from "../../../plataforma/comandos";
import { urlDeFoto } from "../../../negocio/catalogo";
import { Icono } from "./base";
import { useVolverCierra } from "../../../plataforma/navegacion";

type AlSubir = (archivo: File) => Promise<void>;

// Con la foto abierta en grande, el botón de volver del celular la cierra (como cualquier otra
// cosa abierta encima de la pantalla) en vez de cambiar de pantalla; también ofrece cerrarla.
function CierraAlVolver({ alCerrar }: { alCerrar: () => void }) {
  useVolverCierra(alCerrar);
  useComandos({ cerrar: alCerrar }, { encima: true });
  return null;
}

// Con la animación de View Transitions donde el navegador la tiene (Chrome), y sin animación donde no.
function conTransicion(cambio: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
  if (doc.startViewTransition) doc.startViewTransition(cambio);
  else cambio();
}

function useSubirFoto(alSubir?: AlSubir) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function elegida(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !alSubir) return;
    setSubiendo(true); setError(null);
    try { await alSubir(f); } catch (err) { setError(`No se pudo subir la foto: ${(err as Error).message}`); }
    finally { setSubiendo(false); }
  }
  return { subiendo, error, elegida };
}

function SacarOtra({ url, subiendo, elegida }: { url: string | null } & Omit<ReturnType<typeof useSubirFoto>, "error">) {
  const archivo = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={archivo} type="file" accept="image/*" capture="environment" hidden onChange={elegida} data-testid="archivo-foto" />
      <button type="button" className="boton coral" disabled={subiendo} onClick={() => archivo.current?.click()} data-testid="sacar-foto"><Icono nombre="camara" tam={18} />{subiendo ? "Subiendo…" : url ? "Sacar otra foto" : "Sacar foto"}</button>
    </>
  );
}

function FotoGrande({ url, nombre, descripcion, alSubir, alCerrar }: { url: string | null; nombre: string; descripcion: string; alSubir?: AlSubir; alCerrar: () => void }) {
  const { subiendo, error, elegida } = useSubirFoto(alSubir);
  return (
    <div className="foto-grande-fondo" onClick={alCerrar} role="dialog" aria-label={descripcion} data-testid="foto-grande">
      <figure className="foto-grande" onClick={(e) => e.stopPropagation()}>
        {url ? <img src={url} alt={descripcion} style={{ viewTransitionName: nombre }} /> : <div className="sin-foto grande" style={{ viewTransitionName: nombre }}><Icono nombre="camara" tam={64} grosor={1.2} /></div>}
        <figcaption>{descripcion}{!url && <><br /><small>Este producto todavía no tiene foto.</small></>}</figcaption>
        {error && <div className="aviso-error" role="alert"><span>{error}</span></div>}
        <div className="acciones">
          {alSubir && <SacarOtra url={url} subiendo={subiendo} elegida={elegida} />}
          <button type="button" className="boton" onClick={alCerrar}>Cerrar</button>
        </div>
      </figure>
    </div>
  );
}

// Foto chica del producto; al tocarla se amplía con la descripción. En la grande hay un botón para
// sacar (o elegir) una foto nueva desde el celular.
export function FotoProducto({ id, url: urlCruda, descripcion, alSubir }: { id: string; url: string | null; descripcion: string; alSubir?: AlSubir }) {
  const [abierta, setAbierta] = useState(false);
  const url = urlDeFoto(urlCruda);
  const nombre = `foto-${id}`;
  const cambiar = (valor: boolean) => conTransicion(() => setAbierta(valor));
  return (
    <>
      <button type="button" className="foto-chica miniatura" onClick={(e) => { e.stopPropagation(); cambiar(true); }} title={url ? "Ver la foto grande" : "Sin foto todavía"} data-testid="foto-chica">
        {url ? <img src={url} alt="" style={abierta ? undefined : { viewTransitionName: nombre }} /> : null}
      </button>
      {abierta && <CierraAlVolver alCerrar={() => cambiar(false)} />}
      {abierta && <FotoGrande url={url} nombre={nombre} descripcion={descripcion} alSubir={alSubir} alCerrar={() => cambiar(false)} />}
    </>
  );
}
