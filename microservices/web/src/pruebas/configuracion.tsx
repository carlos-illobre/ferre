import type { ReactNode } from "react";
import { Configuracion as DeLaComputadora } from "../pantallas/compu/base/pantallas/Configuracion";
import { ConfiguracionCelu } from "../pantallas/celular/pantallas/Configuracion";

// Para las pruebas: Configuración del celular o de la computadora, como la v2 (021). `propio` ya no
// hace falta: las dos pantallas traen los celulares con huella y el vínculo.
export function Configuracion({ celular = false, alCambiarElGuardado }: { celular?: boolean; alCambiarElGuardado?: () => void; propio?: ReactNode }) {
  return celular ? <ConfiguracionCelu alCambiarElGuardado={alCambiarElGuardado} /> : <DeLaComputadora alCambiarElGuardado={alCambiarElGuardado} />;
}
