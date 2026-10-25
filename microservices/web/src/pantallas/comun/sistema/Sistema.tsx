import { useAjustesDelSistema } from "../../../negocio/sistema";
import { TEXTOS, texto } from "../../textos";
import { DiasDelVinculo } from "./DiasDelVinculo";
import { Tramos } from "./Tramos";
import "../../configuracion.css";

// Más → Sistema (specs/020, RF-135): lo que vale para todos los dispositivos, que fija quien
// tiene «Administrar el sistema». Una sola pantalla para el celular y la computadora, con las
// piezas de Configuración: los tiempos se eligen entre tramos y se guardan al tocar (decisión
// 147); los días del vínculo se escriben, con − y +.
const t = TEXTOS.sistema;

type Texto = (cual: { largo: string; corto: string }) => string;

export function Sistema({ celular = false }: { celular?: boolean }) {
  const { ajustes, sinConexion, error, guardado, cambiar } = useAjustesDelSistema();
  const x: Texto = (cual) => texto(cual, celular);
  const apagado = sinConexion || !ajustes;
  return (
    <main id="contenido" className={celular ? "contenido cfg" : "pagina cfg"} tabIndex={-1} data-testid="sistema">
      <Cabeza celular={celular} x={x} />
      <Avisos sinConexion={sinConexion} error={error} x={x} />
      <ul className="cfg-lista">
        <li className="cfg-fila cfg-sistema">
          <span className="cfg-nombre" id="sis-sesion">{x(t.sesion)}</span>
          <span className="cfg-detalle">{x(t.sesionDetalle)}</span>
          <Tramos etiqueta="sis-sesion" tramos={ajustes?.tramos.sesion_segundos ?? []} elegido={ajustes?.sesion_segundos} apagado={apagado}
            alElegir={(s) => void cambiar({ sesion_segundos: s })} testId="sis-sesion" />
        </li>
        <li className="cfg-fila cfg-sistema">
          <span className="cfg-nombre" id="sis-vinculo">{x(t.vinculo)}</span>
          <span className="cfg-detalle">{x(t.vinculoDetalle)}</span>
          <DiasDelVinculo guardados={ajustes?.vinculo_dias} apagado={apagado} alGuardar={(d) => void cambiar({ vinculo_dias: d })} />
        </li>
      </ul>
      <Nota guardado={guardado} x={x} />
    </main>
  );
}

function Cabeza({ celular, x }: { celular: boolean; x: Texto }) {
  return (
    <header className={celular ? "encabezado" : "pagina-cabeza"}>
      <h1 className={celular ? "titulo" : undefined}>Sistema</h1>
      <p className={celular ? "cfg-bajada" : "bajada"}>{x(t.bajada)}</p>
    </header>
  );
}

function Avisos({ sinConexion, error, x }: { sinConexion: boolean; error: string | null; x: Texto }) {
  return (
    <>
      {sinConexion && <p className="cfg-sin-red" role="status" data-testid="sistema-sin-conexion">{x(t.sinConexion)}</p>}
      {error && <p className="cfg-sin-red cfg-rechazo" role="alert" data-testid="sistema-error">{error}</p>}
    </>
  );
}

// Abajo, lo que quedó guardado para todos o, si no se cambió nada, cuándo llega a cada dispositivo.
function Nota({ guardado, x }: { guardado: string | null; x: Texto }) {
  return (
    <p className="cfg-nota" data-testid="sistema-nota">
      {guardado ? <><span className="cfg-hecho" role="status">✓ Guardado para todos: {guardado}.</span>{x(t.llegaEnUnMinuto)}</> : x(t.nota)}
    </p>
  );
}
