import { useRef, useState } from "react";
import { PedirFotoAlCelular, hayQueUsarElCelular } from "../../PedirFoto";
import { urlDeFoto } from "../../../negocio/catalogo";
import { useSubirFoto } from "../../comun/catalogo/useSubirFoto";
import { Aviso, Boton, Icono, useDialogo } from "../../../ui";

type AlSubir = (archivo: File) => Promise<void>;

// Abre o cierra la foto grande con una transición, si el navegador la tiene y no se pidió quietud.
function conTransicion(cambio: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
  if (doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(cambio);
  else cambio();
}

// Foto chica del producto; al tocarla se amplía con una transición y desde ahí se saca otra.
export function FotoProducto({ id, url: urlCruda, descripcion, alSubir }: { id: string; url: string | null; descripcion: string; alSubir?: AlSubir }) {
  const [abierta, setAbierta] = useState(false);
  const url = urlDeFoto(urlCruda);
  const nombre = `foto-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const cambiar = (valor: boolean) => conTransicion(() => setAbierta(valor));
  return (
    <>
      <button type="button" className="foto-chica" onClick={(e) => { e.stopPropagation(); cambiar(true); }} aria-label={url ? `Ver la foto de ${descripcion}` : `${descripcion} no tiene foto. Agregar una`} data-testid="foto-chica">
        {url ? <img src={url} alt="" loading="lazy" style={abierta ? undefined : { viewTransitionName: nombre }} /> : <Icono nombre="camara" tam={20} grosor={1.6} />}
      </button>
      {abierta && <FotoGrande url={url} nombre={nombre} descripcion={descripcion} alSubir={alSubir} alCerrar={() => cambiar(false)} />}
    </>
  );
}

// Subir la foto nueva: desde un archivo o desde el celular, con su error si falla.
function useSubirFotoDeLaCompu(alSubir?: AlSubir) {
  const s = useSubirFoto(alSubir, (m) => `No se pudo subir la foto: ${m}. Probá de nuevo.`);
  const [pidiendo, setPidiendo] = useState(false);
  const recibir = (f: File | undefined) => { setPidiendo(false); return s.recibir(f); };
  const pedirAlCelular = () => { s.setError(null); setPidiendo(true); };
  return { subiendo: s.subiendo, error: s.error, pidiendo, recibir, elegida: s.elegida, pedirAlCelular, dejarDePedir: () => setPidiendo(false) };
}

type Subida = ReturnType<typeof useSubirFotoDeLaCompu>;

function textoDelArchivo(subiendo: boolean, url: string | null) {
  if (hayQueUsarElCelular()) return "Elegir un archivo";
  return subiendo ? "Subiendo la foto…" : url ? "Sacar otra foto" : "Sacar foto";
}

// La computadora no tiene cámara: la foto la saca el celular, con un código QR.
function SacarOtra({ subida, url }: { subida: Subida; url: string | null }) {
  const archivo = useRef<HTMLInputElement>(null);
  const conCelular = hayQueUsarElCelular();
  return (
    <>
      <input ref={archivo} type="file" accept="image/*" capture="environment" hidden onChange={subida.elegida} data-testid="archivo-foto" />
      {conCelular && <Boton variante="principal" icono="celular" disabled={subida.subiendo} onClick={subida.pedirAlCelular} data-testid="foto-con-celular">{subida.subiendo ? "Subiendo la foto…" : "Sacar la foto con el celular"}</Boton>}
      <Boton variante={conCelular ? undefined : "principal"} icono="camara" disabled={subida.subiendo} onClick={() => archivo.current?.click()} data-testid="sacar-foto">{textoDelArchivo(subida.subiendo, url)}</Boton>
    </>
  );
}

function FotoGrande({ url, nombre, descripcion, alSubir, alCerrar }: { url: string | null; nombre: string; descripcion: string; alSubir?: AlSubir; alCerrar: () => void }) {
  const ref = useDialogo(alCerrar);
  const subida = useSubirFotoDeLaCompu(alSubir);
  return (
    <dialog ref={ref} className={`foto-grande${subida.pidiendo ? " pidiendo" : ""}`} aria-label={`Foto de ${descripcion}`} onClick={(e) => { if (e.target === e.currentTarget) alCerrar(); }} data-testid="foto-grande">
      <figure>
        {url ? <img src={url} alt={descripcion} style={{ viewTransitionName: nombre }} /> : <div className="sin-foto" style={{ viewTransitionName: nombre }}><Icono nombre="camara" tam={72} grosor={1.2} /></div>}
        <figcaption>
          <span>{descripcion}{!url && <><br /><small>Este producto todavía no tiene foto.</small></>}</span>
          <Aviso tipo="error">{subida.error}</Aviso>
          {subida.pidiendo && <PedirFotoAlCelular para={`la foto de ${descripcion}`} alCancelar={subida.dejarDePedir} alRecibir={subida.recibir} />}
          <div className="hoja-pie">
            {alSubir && !subida.pidiendo && <SacarOtra subida={subida} url={url} />}
            <Boton onClick={alCerrar}>Cerrar</Boton>
          </div>
        </figcaption>
      </figure>
    </dialog>
  );
}
