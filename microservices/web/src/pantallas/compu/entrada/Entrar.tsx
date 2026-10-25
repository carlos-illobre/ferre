import { useState } from "react";
import { hayHuella, huellaVinculadaAca, sesionCerradaPorElServidor } from "../../../negocio/entrada";
import { useConexion } from "../../../negocio/conexion";
import { TEXTOS_DE_ENTRADA } from "../../comun/entrada/textos-de-entrada";
import { Aviso, Icono } from "../base/ui";
import { BotonGoogle, BotonHuella } from "./BotonesDeEntrada";
import { CodigoParaEntrar } from "./CodigoParaEntrar";
import { MarcoDeEntradaConCelular } from "./MarcoDeEntradaConCelular";
import "../base/estilos/entrar.css";
import "../base/estilos/entrar-con-celular.css";

// Dos formas de entrar, sin contraseñas (ADR-011): el código para el celular, que es la más rápida,
// o la huella del dispositivo vinculado o la cuenta de Google. Sin servidor no se entra.
export function Entrar() {
  // Sin preguntar (RF-143): con el código en pantalla, el canal dice en el momento si se cortó.
  const conexion = useConexion();
  const sinConexion = conexion === "sin-conexion";
  const [cerrada] = useState(sesionCerradaPorElServidor);
  return (
    <MarcoDeEntradaConCelular conexion={conexion}>
      <div className="entrar-cc-titulo">
        <h2>{TEXTOS_DE_ENTRADA.conElCelular}</h2>
        <span className="entrar-cc-pastilla"><Icono nombre="celular" tam={14} />{TEXTOS_DE_ENTRADA.masRapida}</span>
      </div>
      <p className="entrar-cc-rapido">{TEXTOS_DE_ENTRADA.conTuUsuario}</p>
      {cerrada && <Aviso tipo="alerta" testId="sesion-cerrada"><strong className="entrar-error-titulo">Hay que iniciar sesión</strong>La sesión de este dispositivo se cerró o venció. Entrá de nuevo para seguir.</Aviso>}
      <CodigoParaEntrar enLinea={!sinConexion} />
      {sinConexion && <Aviso tipo="alerta" testId="entrar-sin-conexion">{TEXTOS_DE_ENTRADA.sinConexion}</Aviso>}
      <div className="entrar-o" aria-hidden="true"><span>o</span></div>
      <OtrasFormas sinConexion={sinConexion} />
      <p className="entrar-nota">
        <Icono nombre="escudo" tam={18} />
        <span>{TEXTOS_DE_ENTRADA.nota}</span>
      </p>
    </MarcoDeEntradaConCelular>
  );
}

// Sin servidor tampoco se entra con Google ni con la huella: quedan apagados y no se pueden tocar (decisión 118).
function OtrasFormas({ sinConexion }: { sinConexion: boolean }) {
  return (
    <div className={`entrar-cc-otras${sinConexion ? " apagado" : ""}`} data-testid="entrar-otras" aria-disabled={sinConexion} {...(sinConexion ? { inert: "" } : {})}>
      {hayHuella() && huellaVinculadaAca() && <BotonHuella />}
      <BotonGoogle estirar />
    </div>
  );
}
