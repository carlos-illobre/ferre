import type { Conteo } from "../../../negocio/deposito";
import { useComandos } from "../../../plataforma/comandos";
import { AlLadoDeLasPestanas } from "../../AlLadoDeLasPestanas";
import { TEXTOS } from "../../textos";
import { Aviso, Boton, hayUnaVentanaAbierta, Toast } from "../base/ui";
import { Icono } from "../../../ui/iconos";
import { BuscarParaContar } from "./BuscarParaContar";
import { CabezaDelConteo } from "./CabezaDelConteo";
import { CerrarSector } from "./CerrarSector";
import { ColumnasDelConteo } from "./ColumnasDelConteo";
import { ContandoUno } from "./ContandoUno";
import { ResultadoDelConteo } from "./ResultadoDelConteo";
import { useConteoDeSector, type ConteoDeSector as Estado } from "./useConteoDeSector";
import css from "./Contar.module.css";

// El conteo abierto del sector elegido, a la derecha de la lista: cerrar el sector y pedirle el
// lector al celular vinculado.
const t = TEXTOS.contar;
const SIN_CONEXION = "Sin conexión: seguí contando. Lo contado queda guardado en este dispositivo y se manda solo al volver internet; cerrar el sector necesita conexión.";
type Props = { conteo: Conteo; alActualizar: (c: Conteo) => void; alCerrado: () => void; alOtro: () => void };

export function ConteoDeSector({ conteo, alActualizar, alCerrado, alOtro }: Props) {
  const x = useConteoDeSector(conteo, alActualizar);
  useAccionesDelConteo(x);
  if (x.resultado) return <ResultadoDelConteo sector={conteo.sector} resultado={x.resultado} id={x.id} alOtro={alOtro} />;
  return (
    <div className={css.conteo} data-testid="conteo">
      <AccionesDelConteo x={x} />
      <CabezaDelConteo conteo={conteo} conDiferencia={x.conDiferencia.length} />
      <Aviso tipo="alerta" testId="sin-conexion">{!x.enLinea ? SIN_CONEXION : null}</Aviso>
      <Aviso tipo="error">{x.errorCatalogo}</Aviso>
      <Toast texto={x.mensaje} alCerrar={() => x.setMensaje(null)} />
      {x.lectorPedido !== null && <Aviso tipo={x.lectorPedido ? "info" : "alerta"}>{x.lectorPedido ? "Abrí Ferrebress en el celular y tocá «Abrir el lector»." : "No se pudo avisar al celular."}</Aviso>}
      <BuscarParaContar x={x} />
      <Aviso tipo="error" testId="error-conteo">{x.error}</Aviso>
      {x.producto && <ContandoUno x={x} producto={x.producto} />}
      <ColumnasDelConteo x={x} />
      {x.cerrando && (
        <CerrarSector conteo={conteo} cerrarConteo={x.cerrar} conDiferencia={x.conDiferencia.length} enLinea={x.enLinea} pendientes={x.enElDispositivo.size} alCerrar={() => x.setCerrando(false)}
          alCerrado={(cierre) => { x.setCerrando(false); x.setResultado({ cierre, ajustes: x.conDiferencia }); alCerrado(); }} />
      )}
    </div>
  );
}

function AccionesDelConteo({ x }: { x: Estado }) {
  return (
    <AlLadoDeLasPestanas>
      <div className={css.acciones}>
        {x.emparejado && <Boton tam="chico" onClick={x.pedirLector} accion="conteo.lector" kbd data-testid="pedir-lector"><Icono nombre="scan-barcode" tam={16} />{t.escanearConElCelular.largo} </Boton>}
        <Boton tam="chico" variante="principal" className={css.cerrar} disabled={x.conteo.renglones.length === 0} onClick={() => x.setCerrando(true)} accion="conteo.cerrar" kbd data-testid="cerrar"><Icono nombre="square-check-big" tam={16} />{t.cerrarElSector.largo} </Boton>
      </div>
    </AlLadoDeLasPestanas>
  );
}

// Lo que ofrece el conteo, salvo con una ventana abierta o ya cerrado.
function useAccionesDelConteo(x: Estado) {
  const libre = (puede: boolean, hacer: () => void) => () => (!puede || hayUnaVentanaAbierta() || x.resultado ? false : hacer());
  useComandos({
    "conteo.cerrar": libre(x.conteo.renglones.length > 0, () => x.setCerrando(true)),
    "conteo.lector": libre(Boolean(x.emparejado), x.pedirLector),
  });
}
