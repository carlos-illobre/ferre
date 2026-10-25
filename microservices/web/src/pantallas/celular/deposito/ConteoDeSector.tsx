import type { Conteo } from "../../../negocio/deposito";
import { AvisoError, Icono } from "../componentes/base";
import { BuscarParaContar } from "./BuscarParaContar";
import { CerrarElSector } from "./CerrarElSector";
import { ContadosDelSector } from "./ContadosDelSector";
import { ContandoUno } from "./ContandoUno";
import { useConteoDelCelular } from "./useConteoDelCelular";

// El conteo abierto de un sector: buscar o escanear, cuántas hay, siguiente. «Sectores» vuelve y
// deja el sector abierto para seguir después.
type Props = { conteo: Conteo; alActualizar: (c: Conteo) => void; alSalir: () => void };

export function ConteoDeSector({ conteo, alActualizar, alSalir }: Props) {
  const x = useConteoDelCelular(conteo, alActualizar);
  if (x.resultado) return <><Cabecera sector={conteo.sector} alSalir={alSalir} /><SectorCerrado sector={conteo.sector} resultado={x.resultado} alSalir={alSalir} /></>;
  return (
    <>
      <Cabecera sector={conteo.sector} alSalir={alSalir} />
      <AvisoError texto={x.error} alCerrar={() => x.setError(null)} />
      <div className="lateral">
        <div className="columna al-costado">{x.producto ? <ContandoUno x={x} producto={x.producto} /> : <BuscarParaContar x={x} />}</div>
        <div className="columna">
          <ContadosDelSector x={x} />
          <CerrarElSector x={x} />
        </div>
      </div>
    </>
  );
}

function Cabecera({ sector, alSalir }: { sector: string; alSalir: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <button type="button" className="enlace" style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={alSalir} title="El sector queda abierto para seguir después"><Icono nombre="izquierda" tam={18} grosor={2.5} />Sectores</button>
      <strong role="heading" aria-level={2}>{sector}</strong>
    </div>
  );
}

function SectorCerrado({ sector, resultado, alSalir }: { sector: string; resultado: NonNullable<ReturnType<typeof useConteoDelCelular>["resultado"]>; alSalir: () => void }) {
  return (
    <div className="tarjeta tarjeta-resultado">
      <div className="tilde"><Icono nombre="tilde" tam={30} grosor={3} className="" /></div>
      <strong>{sector} cerrado</strong>
      <p className="subtitulo" role="status" data-testid="resultado-conteo">{resultado.contados} productos contados, {resultado.ajustados} con diferencia ajustada{resultado.puestos_en_cero ? `, ${resultado.puestos_en_cero} puestos en cero` : ""}.</p>
      <button type="button" className="boton tinta" onClick={alSalir}>Contar otro sector</button>
    </div>
  );
}
