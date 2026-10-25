import { hayCamara } from "../../../plataforma/camara";
import { IndicadorDelVinculo } from "../../IndicadorDelVinculo";
import { TEXTOS_DEL_VINCULO } from "../../textos";

// A la derecha del encabezado de cualquier pantalla (decisiones 70 y 73): sin vínculo,
// «Vincular»; con vínculo, el estado de la conexión con la computadora (specs/023), que al
// tocarlo muestra el detalle con «Desconectar» o «Reconectar». Desvincular está en Más.
export function VincularArriba({ emparejado, escanear }: { emparejado: boolean; escanear: () => void }) {
  if (!emparejado && !hayCamara()) return null;
  return (
    <div className="vincular-lugar">
      {!emparejado ? (
        <button type="button" className="vincular-boton" data-testid="vincular-arriba" aria-label="Vincular con la computadora" title="Vincular con la computadora" onClick={escanear}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4M12 7v6M9 10h6" /></svg>
          <span>{TEXTOS_DEL_VINCULO.vincular}</span>
        </button>
      ) : <IndicadorDelVinculo celular />}
    </div>
  );
}
