import { Aviso, Boton, Pagina, Progreso, Vacio } from "../base/ui";
import { ConteoDeSector } from "./ConteoDeSector";
import { ListaDeSectores } from "./ListaDeSectores";
import { ResumenDeSectores } from "./ResumenDeSectores";
import { SectorNuevo } from "./SectorNuevo";
import { SectorSinAbrir } from "./SectorSinAbrir";
import { useContar, type Contar as EstadoDeContar } from "./useContar";
import css from "./Contar.module.css";

// Contar, como la v2 («Sectores y conteo», decisión 148): arriba cuánto del stock está cargado y
// qué falta contar; a la izquierda los sectores con su estado (en curso, nunca contado, la fecha
// del último conteo); a la derecha el sector elegido. Si tiene un conteo abierto, se cuenta ahí
// mismo: buscar o escanear, «¿Cuántas hay?», Enter y el siguiente, con los contados (y su
// diferencia) al lado de los que faltan. El sector queda abierto hasta cerrarlo; al cerrar, cada
// diferencia contra el sistema pasa a ser un ajuste. Empezar a contar un sector se pide con su
// botón: elegirlo en la lista no abre un conteo. Teclas: Alt C cierra el sector, Alt E le pide
// el lector al celular vinculado.
const SIN_CONEXION = "Sin conexión: empezar o retomar un sector, y crear uno nuevo, necesitan internet. Un conteo que ya está abierto en esta pantalla se sigue contando igual.";

export function Contar() {
  const x = useContar();
  return (
    <Pagina titulo="Contar" testId="pantalla-contar" className={css.v2}>
      <AvisosDeContar x={x} />
      {x.sectores?.length === 0 && <SinSectores x={x} />}
      {Boolean(x.sectores?.length) && (
        <>
          <ResumenDeSectores resumen={x.resumen} />
          <div className={css.cuerpo}>
            <ListaDeSectores x={x} />
            <section className={css.panel} aria-label={x.elegido?.nombre}><ElPanel x={x} /></section>
          </div>
        </>
      )}
      {x.nuevo && <SectorNuevo alCerrar={() => x.setNuevo(false)} alCrear={x.crear} />}
    </Pagina>
  );
}

function SinSectores({ x }: { x: EstadoDeContar }) {
  return (
    <Vacio icono="contar" titulo="Todavía no hay sectores" accion={<Boton variante="principal" icono="mas" onClick={() => x.setNuevo(true)} disabled={!x.enLinea} data-testid="sector-nuevo">Crear el primer sector</Boton>}>
      Un sector es un lugar del local que se cuenta de una vez: una estantería, una pared de herramientas, el mostrador. Ponele nombre al primero y empezá a contar.
    </Vacio>
  );
}

// A la derecha: el conteo abierto del elegido o, si no tiene, el botón para empezarlo.
function ElPanel({ x }: { x: EstadoDeContar }) {
  const { elegido, conteo } = x;
  if (!elegido) return null;
  if (conteo?.sector_id === elegido.id) return <ConteoDeSector key={conteo.id} conteo={conteo} alActualizar={x.setConteo} alCerrado={() => void x.cargarSectores()} alOtro={x.otro} />;
  return <SectorSinAbrir sector={elegido} abriendo={x.abriendo} enLinea={x.enLinea} alAbrir={() => void x.abrir(elegido.id)} />;
}

function AvisosDeContar({ x }: { x: EstadoDeContar }) {
  const sinSectores = x.sectores === null;
  return (
    <>
      <Aviso tipo="alerta" testId="sin-conexion">{!x.enLinea ? SIN_CONEXION : null}</Aviso>
      <Aviso tipo="error" accion={sinSectores ? <Boton tam="chico" icono="repetir" onClick={() => void x.cargarSectores()}>Reintentar</Boton> : undefined}>{x.error}</Aviso>
      {sinSectores && !x.error && <Progreso texto="Trayendo los sectores…" />}
    </>
  );
}
