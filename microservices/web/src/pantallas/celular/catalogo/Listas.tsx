import { useState } from "react";
import { usePuede } from "../../../negocio/usuarios";
import { mensajeDeLista, pendientes, retomar, ultimaAplicada, useListas, type Cargada, type ListaFila } from "../../../negocio/catalogo";
import { AvisoError, Toast } from "../componentes/base";
import { AltaDeProveedor } from "./AltaDeProveedor";
import { PendientesDeRevisar } from "./PendientesDeRevisar";
import { ProveedoresDeListas } from "./ProveedoresDeListas";
import { Revision } from "./Revision";
import { UltimasCargas } from "./UltimasCargas";
import { ZonaDeCarga } from "./ZonaDeCarga";

// Cargar una lista de precios (issue #12): elegir el archivo → revisar el resumen y la
// vista previa en una hoja → aplicar o descartar. Nada se guarda hasta "Aplicar".
export function Listas() {
  const esDueno = usePuede()("catalogo.listas");
  const { proveedores: traidos, historial, error: fallo, recargar } = useListas();
  const proveedores = traidos ?? [];
  const [cargada, setCargada] = useState<Cargada | null>(null);
  // El aviso se puede cerrar; vuelve si el próximo pedido falla de nuevo.
  const [cerrado, setCerrado] = useState<unknown>(null);
  const error = !fallo || fallo === cerrado ? null : mensajeDeLista(fallo);
  const [resultado, setResultado] = useState<string | null>(null);
  const [altaAbierta, setAltaAbierta] = useState(false);
  const abrirPendiente = (l: ListaFila) => setCargada(retomar(l));
  return (
    <>
      <AvisoError texto={error} alCerrar={() => setCerrado(fallo)} />
      <Toast texto={resultado} alCerrar={() => setResultado(null)} testId="resultado" />
      <div className="dos-columnas">
        <div className="columna">
          <PendientesDeRevisar sinAplicar={pendientes(historial)} alAbrir={abrirPendiente} />
          <ZonaDeCarga proveedores={proveedores} alCargar={setCargada} />
          {/* El orden lo pidió Carlos: primero cargar, después las últimas tres cargas y al final los proveedores. */}
          <UltimasCargas ultimas={historial.filter((l) => l.estado !== "pendiente").slice(0, 3)} />
        </div>
        <div className="columna">
          <ProveedoresDeListas activos={proveedores.filter((p) => p.activo)} ultima={ultimaAplicada(historial)} esDueno={esDueno} alAgregar={() => setAltaAbierta(true)} />
        </div>
      </div>
      {cargada && <Revision cargada={cargada} alTerminar={(mensaje) => { setCargada(null); setResultado(mensaje ?? null); void recargar(); }} />}
      {altaAbierta && <AltaDeProveedor alCerrar={() => setAltaAbierta(false)} alCambiar={async () => { await recargar(); setAltaAbierta(false); }} />}
    </>
  );
}
