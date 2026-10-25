import { Configuracion as DeLaComputadora } from "../pantallas/compu/configuracion/Configuracion";
import { ConfiguracionCelu } from "../pantallas/celular/configuracion/ConfiguracionCelu";

// Para las pruebas: Configuración del celular o de la computadora, como la v2 (021). Las dos
// pantallas traen los celulares con huella y el vínculo.
export function Configuracion({ celular = false, alCambiarElGuardado }: { celular?: boolean; alCambiarElGuardado?: () => void }) {
  return celular ? <ConfiguracionCelu alCambiarElGuardado={alCambiarElGuardado} /> : <DeLaComputadora alCambiarElGuardado={alCambiarElGuardado} />;
}
