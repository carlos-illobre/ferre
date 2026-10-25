import { useEffect, useState } from "react";
import { pedirFotoAlCelular } from "../negocio/vinculo";
import { puestoLocal } from "../negocio/vinculo";
import "./foto-de-factura.css";

// La computadora no tiene cámara: donde haga falta una foto se la pide al celular emparejado, que
// la saca y la manda; la foto llega sola acá, como un archivo más (decisiones 41 y 152). Sirve
// para la factura de un ingreso, la foto de un producto o la captura de un ticket. Sin celular
// emparejado no hay código QR: se elige un archivo o se vincula el celular (023-E24).
// Solo en la aplicación: las versiones históricas no reciben funcionalidad nueva (decisión 46).
export const hayQueUsarElCelular = () => window.innerWidth >= 900;

export function PedirFotoAlCelular({ para, alRecibir, alCancelar }: { para: string; alRecibir: (foto: File) => void | Promise<void>; alCancelar: () => void }) {
  const [emparejado] = useState(() => Boolean(puestoLocal()));
  const [recibiendo, setRecibiendo] = useState(false);

  useEffect(() => {
    const pedido = pedirFotoAlCelular(para);
    if (!pedido) return;
    let vigente = true;
    void pedido.foto.then(async (f) => { if (!vigente) return; setRecibiendo(true); await alRecibir(f); });
    return () => { vigente = false; pedido.cancelar(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [para]);

  return (
    <div className="ff-pedido" role="status" data-testid="pedido-de-foto">
      <div className="ff-texto">
        {emparejado ? (
          <>
            <strong>{recibiendo ? "Llegó la foto, un momento…" : "Pedida a tu celular"}</strong>
            <ol data-testid="pedida-al-celular">
              <li>Abrí Ferrebress en el celular: te aparece «La computadora pide una foto».</li>
              <li>Tocá «Sacar la foto». La foto aparece sola acá.</li>
            </ol>
          </>
        ) : (
          <>
            <strong>No hay un celular vinculado</strong>
            <p data-testid="foto-sin-celular">Para sacarla con el celular, vinculalo con «Vincular el celular». Si ya la tenés en la computadora, elegí el archivo.</p>
          </>
        )}
        <div className="ff-botones"><button type="button" className="ff-boton" onClick={alCancelar}>Cancelar</button></div>
      </div>
    </div>
  );
}
