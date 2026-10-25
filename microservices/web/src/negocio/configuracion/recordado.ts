import { useState } from "react";
import { leerRecordado, recordar } from "../../datos/almacenamiento";

// Algo que la persona dejó así en este aparato y se recuerda la próxima vez (el menú plegado, el
// panel oculto, el dispositivo del manual): uno de `valores`; lo que no sea uno de ellos (o si no
// se puede guardar), el primero.
export function useRecordado<T extends string>(clave: string, valores: readonly [T, ...T[]]): [T, (v: T) => void] {
  const leido = () => (valores.find((v) => v === leerRecordado(clave)) ?? valores[0]);
  const [valor, setValor] = useState<T>(leido);
  const cambiar = (v: T) => { setValor(v); recordar(clave, v); };
  return [valor, cambiar];
}
