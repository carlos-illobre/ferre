import { useEffect, useState } from "react";
import { pedirLector } from "../../../negocio/vinculo";
import { Boton, Pastilla } from "../base/ui";
import { HojaParaVincular } from "./HojaParaVincular";

// En la computadora: un QR que el celular lee con su cámara. Queda vinculado 12 horas y lo que
// escanea aparece en la venta. `comoV2`: el botón de la v2, con el ícono de escanear (y su clase, en Vender).
type ComoV2 = { clase?: string };
type Props = { vinculado: boolean; alVincular: (puestoId: string) => void; alPedir?: () => void; comoV2?: ComoV2 };

export function VincularParaEscanear({ vinculado, alVincular, alPedir, comoV2 }: Props) {
  if (vinculado) return <PedirElLector alPedir={alPedir} comoV2={comoV2} />;
  return <HojaParaVincular alVincular={alVincular} />;
}

// Con el celular emparejado no hay código que leer: se le pide que abra el lector (decisión 59).
function PedirElLector({ alPedir, comoV2 }: { alPedir?: () => void; comoV2?: ComoV2 }) {
  const [pedido, setPedido] = useState<"si" | "no" | null>(null);
  async function pedir() { const ok = await pedirLector(); setPedido(ok ? "si" : "no"); if (ok) alPedir?.(); }
  useEffect(() => { if (!pedido) return; const t = setTimeout(() => setPedido(null), 20000); return () => clearTimeout(t); }, [pedido]);
  return (
    <span className="fila" data-testid="celular-vinculado">
      <Boton icono={comoV2 ? "escanear" : "celular"} className={comoV2?.clase} onClick={() => void pedir()} data-testid="pedir-lector">Escanear con el celular</Boton>
      {pedido === "si" && <Pastilla tipo="ok"><span data-testid="lector-pedido">Abrí Ferrebress en el celular y tocá «Abrir el lector»</span></Pastilla>}
      {pedido === "no" && <Pastilla tipo="alerta">No se pudo avisar al celular</Pastilla>}
    </span>
  );
}
