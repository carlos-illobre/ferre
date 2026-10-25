import { useRef, useState } from "react";
import { fotoPedida, mandarFotoALaCompu } from "../pedidos-al-celular";
import "./foto-de-factura.css";

type Estado = "lista" | "subiendo" | "enviada" | "vencido";

// Sacar la foto y mandarla; si falla, se puede volver a probar.
function useMandarFoto(codigo: string, hayPedido: boolean) {
  const [estado, setEstado] = useState<Estado>(hayPedido ? "lista" : "vencido");
  const [error, setError] = useState<string | null>(null);
  async function subir(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Eso no es una foto."); return; }
    setEstado("subiendo"); setError(null);
    try {
      await mandarFotoALaCompu(codigo, f);
      setEstado("enviada");
    } catch (e) {
      setEstado("lista"); setError((e as Error).message || "No se pudo mandar la foto. Probá de nuevo.");
    }
  }
  return { estado, error, subir };
}

function SacarLaFoto({ para, subiendo, alTocar }: { para: string; subiendo: boolean; alTocar: () => void }) {
  return (
    <>
      <p>La computadora pidió <strong>{para}</strong>. Sacala y va a aparecer sola allá.</p>
      <button type="button" className="ff-boton fuerte ff-grande-boton" disabled={subiendo} onClick={alTocar} data-testid="sacar-comprobante">
        {subiendo ? "Mandando la foto…" : "Sacar la foto"}
      </button>
    </>
  );
}

// La pantalla que abre el celular desde el aviso «La computadora pide una foto»: saca la foto y
// la manda por la conexión entre los dos (specs/023), para que aparezca en la computadora donde
// se pidió (la factura de un ingreso, un producto, un ticket).
export function FotoParaLaCompu({ codigo }: { codigo: string }) {
  const pedido = fotoPedida(codigo);
  const { estado, error, subir } = useMandarFoto(codigo, Boolean(pedido));
  const archivo = useRef<HTMLInputElement>(null);
  return (
    <main className="ff-celular" data-testid="foto-para-la-compu">
      <h1>Foto para la computadora</h1>
      <input ref={archivo} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void subir(e.target.files?.[0]); e.target.value = ""; }} data-testid="archivo-para-la-compu" />
      {estado === "vencido" && <><p className="ff-error" role="alert">Este pedido ya no está.</p><p>En la computadora pedí la foto otra vez: el aviso te aparece acá.</p></>}
      {(estado === "lista" || estado === "subiendo") && <SacarLaFoto para={pedido?.para ?? "la computadora"} subiendo={estado === "subiendo"} alTocar={() => archivo.current?.click()} />}
      {estado === "enviada" && (
        <>
          <p className="ff-listo" role="status">Listo: la foto ya está en la computadora.</p>
          <p>Si salió mal, en la computadora pedí la foto otra vez.</p>
          <a className="ff-boton ff-grande-boton" href="#/">Ir a la aplicación</a>
        </>
      )}
      {error && <p className="ff-error" role="alert">{error}</p>}
    </main>
  );
}
