import { useEffect, useRef, useState } from "react";
import { api, reducirImagen } from "../api";
import "./foto-de-factura.css";

// La pantalla que abre el celular al leer el código QR de la computadora: saca la foto y la
// manda con ese código, para que aparezca en la computadora donde se pidió (la factura de un
// ingreso, un producto, un ticket).
export function FotoParaLaCompu({ codigo }: { codigo: string }) {
  const [estado, setEstado] = useState<"revisando" | "lista" | "subiendo" | "enviada" | "vencido">("revisando");
  const [error, setError] = useState<string | null>(null);
  const [para, setPara] = useState("la computadora");
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ para: string }>(`/pedidos-de-foto/${encodeURIComponent(codigo)}`)
      .then((p) => { setPara(p.para); setEstado("lista"); })
      .catch((e) => { if ((e as { estado?: number }).estado === 404) setEstado("vencido"); else { setEstado("lista"); setError("Sin conexión: para mandar la foto hace falta internet."); } });
  }, [codigo]);

  async function subir(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Eso no es una foto."); return; }
    setEstado("subiendo"); setError(null);
    try {
      const datos = new FormData();
      datos.append("foto", await reducirImagen(f, 2000), "foto.jpg");
      await api(`/pedidos-de-foto/${encodeURIComponent(codigo)}/foto`, { method: "POST", body: datos });
      setEstado("enviada");
    } catch (e) {
      const err = e as { estado?: number; message: string };
      if (err.estado === 404) setEstado("vencido");
      else { setEstado("lista"); setError(err.estado ? `${err.message}.` : "Sin conexión: no se pudo mandar la foto. Probá de nuevo."); }
    }
  }

  return (
    <main className="ff-celular" data-testid="foto-para-la-compu">
      <h1>Foto para la computadora</h1>
      <input ref={archivo} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void subir(e.target.files?.[0]); e.target.value = ""; }} data-testid="archivo-para-la-compu" />
      {estado === "revisando" && <p aria-busy="true">Un momento…</p>}
      {estado === "vencido" && <><p className="ff-error" role="alert">El código venció o ya no vale.</p><p>En la computadora pedí la foto otra vez y apuntá al código nuevo.</p></>}
      {(estado === "lista" || estado === "subiendo") && (
        <>
          <p>La computadora pidió <strong>{para}</strong>. Sacala y va a aparecer sola allá.</p>
          <button type="button" className="ff-boton fuerte ff-grande-boton" disabled={estado === "subiendo"} onClick={() => archivo.current?.click()} data-testid="sacar-comprobante">
            {estado === "subiendo" ? "Mandando la foto…" : "Sacar la foto"}
          </button>
        </>
      )}
      {estado === "enviada" && (
        <>
          <p className="ff-listo" role="status">Listo: la foto ya está en la computadora.</p>
          <p>Si salió mal, en la computadora pedí la foto otra vez y volvé a apuntar al código.</p>
          <a className="ff-boton ff-grande-boton" href="#/">Ir a la aplicación</a>
        </>
      )}
      {error && <p className="ff-error" role="alert">{error}</p>}
    </main>
  );
}
