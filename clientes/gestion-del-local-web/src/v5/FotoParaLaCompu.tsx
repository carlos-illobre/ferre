import { useEffect, useRef, useState } from "react";
import { api, reducirImagen } from "../api";
import "./foto-de-factura.css";

// La pantalla que abre el celular al leer el código QR de la computadora: saca la foto del
// comprobante y la sube con ese código, para que aparezca en el ingreso que se está cargando
// en la computadora (RF-50).
export function FotoParaLaCompu({ codigo }: { codigo: string }) {
  const [estado, setEstado] = useState<"revisando" | "lista" | "subiendo" | "enviada" | "vencido">("revisando");
  const [error, setError] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api(`/compras/fotos/pedidos/${encodeURIComponent(codigo)}`)
      .then(() => setEstado("lista"))
      .catch((e) => { if ((e as { estado?: number }).estado === 404) setEstado("vencido"); else { setEstado("lista"); setError("Sin conexión: para mandar la foto hace falta internet."); } });
  }, [codigo]);

  async function subir(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Eso no es una foto."); return; }
    setEstado("subiendo"); setError(null);
    try {
      const datos = new FormData();
      datos.append("pedido", codigo);
      datos.append("foto", await reducirImagen(f, 2000), "comprobante.jpg");
      await api("/compras/fotos", { method: "POST", body: datos });
      setEstado("enviada");
    } catch (e) {
      const err = e as { estado?: number; message: string };
      if (err.estado === 404) setEstado("vencido");
      else { setEstado("lista"); setError(err.estado ? `${err.message}.` : "Sin conexión: no se pudo mandar la foto. Probá de nuevo."); }
    }
  }

  return (
    <main className="ff-celular" data-testid="foto-para-la-compu">
      <h1>Foto de la factura</h1>
      <input ref={archivo} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void subir(e.target.files?.[0]); e.target.value = ""; }} data-testid="archivo-comprobante" />
      {estado === "revisando" && <p aria-busy="true">Un momento…</p>}
      {estado === "vencido" && <><p className="ff-error" role="alert">El código venció o ya no vale.</p><p>En la computadora tocá otra vez «Sacar la foto con el celular» y apuntá al código nuevo.</p></>}
      {(estado === "lista" || estado === "subiendo") && (
        <>
          <p>Sacale una foto a la factura o al remito. Va a aparecer sola en la computadora.</p>
          <button type="button" className="ff-boton fuerte ff-grande-boton" disabled={estado === "subiendo"} onClick={() => archivo.current?.click()} data-testid="sacar-comprobante">
            {estado === "subiendo" ? "Mandando la foto…" : "Sacar la foto"}
          </button>
        </>
      )}
      {estado === "enviada" && (
        <>
          <p className="ff-listo" role="status">Listo: la foto ya está en la computadora.</p>
          <p>Si salió mal, en la computadora tocá «Cambiar» y volvé a apuntar al código.</p>
          <a className="ff-boton ff-grande-boton" href="#/">Ir a la aplicación</a>
        </>
      )}
      {error && <p className="ff-error" role="alert">{error}</p>}
    </main>
  );
}
