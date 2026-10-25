import { Boton } from "./Boton";
import { useDialogo } from "./dialogo";
import { Icono } from "./iconos";
import { useComandos } from "../plataforma/comandos";

// La pantalla entera de «Listo» después de cobrar o de registrar: qué se hizo, el importe, el
// medio y un botón para seguir, que también se pide como acción («exito.seguir»).
export function Exito({ que, importe, medio, detalle, boton, alCerrar }: { que: string; importe: string; medio: string; detalle: string; boton: string; alCerrar: () => void }) {
  const ref = useDialogo(alCerrar);
  useComandos({ "exito.seguir": alCerrar }, { encima: true });
  return (
    <dialog ref={ref} className="exito" aria-label={que} data-testid="exito">
      <div className="tilde"><Icono nombre="tilde" tam={48} grosor={3} /></div>
      <h2 className="que">{que}</h2>
      <div className="importe">{importe}</div>
      <div className="medio">{medio}</div>
      <p className="detalle">{detalle}</p>
      <Boton variante="principal" tam="grande" autoFocus onClick={alCerrar} data-testid="cerrar-exito" accion="exito.seguir">{boton}</Boton>
    </dialog>
  );
}
