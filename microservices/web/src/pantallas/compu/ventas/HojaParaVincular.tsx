import { useState } from "react";
import { createPortal } from "react-dom";
import { useCodigoParaVincular } from "../../../negocio/vinculo";
import { Aviso, Boton, Hoja, Icono } from "../base/ui";
import css from "./HojaParaVincular.module.css";

// «Vincular el celular»: abre la ventana con el código, que vence a los 5 minutos.
export function HojaParaVincular({ alVincular }: { alVincular: (puestoId: string) => void }) {
  const [abierta, setAbierta] = useState(false);
  const codigo = useCodigoParaVincular((id) => { setAbierta(false); alVincular(id); }, { ancho: 260, oscuro: "#0f1e36" });
  async function generar() { setAbierta(true); await codigo.generar(); }
  function cerrar() { codigo.cerrar(); setAbierta(false); }
  return (
    <>
      <Boton icono="celular" onClick={() => void generar()} data-testid="emparejar-celular">Vincular el celular</Boton>
      {/* La ventana se dibuja en el cuerpo de la aplicación y no donde está el botón: dentro del
          menú lateral heredaba sus estilos (el título y el botón de cerrar salían deformados). */}
      {abierta && createPortal(
        <Hoja titulo="Vincular el celular con esta computadora" alCerrar={cerrar} testId="hoja-vincular">
          <div className={css.vincular}><CodigoQr {...codigo} /><Pasos /></div>
          <Aviso tipo="error">{codigo.error}</Aviso>
          {codigo.vencido && <Aviso tipo="alerta" accion={<Boton tam="chico" onClick={() => void generar()}>Generar otro</Boton>}>El código venció a los 5 minutos.</Aviso>}
          {codigo.qr && <p className="detalle">El código vence en 5 minutos. No hace falta instalar nada en el celular.</p>}
        </Hoja>,
        document.querySelector(".cuerpo") ?? document.body,
      )}
    </>
  );
}

function CodigoQr({ qr, vencido, error }: { qr: string | null; vencido: boolean; error: string | null }) {
  return (
    <div className={css.qr} data-testid="qr-vincular">
      {qr ? <img src={qr} alt="Código para vincular el celular" width={220} height={220} /> : vencido || error ? <Icono nombre="celular" tam={56} grosor={1.4} /> : <div className="esqueleto" aria-label="Generando el código" />}
    </div>
  );
}

function Pasos() {
  return (
    <ol className="pasos">
      <li><span>En el celular, abrí Ferrebress y andá a Más → «Vincular con la computadora».</span></li>
      <li><span>Apuntá a este código. (También sirve la cámara del teléfono: tocá el enlace que aparece.)</span></li>
      <li><span>Listo: el celular y esta computadora trabajan en espejo. Lo que hagas en uno se ve en el otro, y el celular pone la cámara.</span></li>
    </ol>
  );
}
