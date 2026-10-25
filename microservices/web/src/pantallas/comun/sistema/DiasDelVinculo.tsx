import { useEffect, useRef, useState } from "react";
import { diasValidos, DIAS_MAX, DIAS_MIN } from "../../../negocio/sistema";

const ESPERA_DE_LOS_DIAS_MS = 700; // − y + seguidos se guardan juntos

// Los días del vínculo: el número, con − y +. Se guarda al dejar de tocar − o +, y al terminar de
// escribirlo (Enter o salir de la caja). Fuera de 1 a 365 no se guarda y lo dice.
export function DiasDelVinculo({ guardados, apagado, alGuardar }: { guardados: number | undefined; apagado: boolean; alGuardar: (d: number) => void }) {
  const [escrito, setEscrito] = useState("");
  const [mal, setMal] = useState(false);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { if (guardados !== undefined) { setEscrito(String(guardados)); setMal(false); } }, [guardados]);
  useEffect(() => () => { if (espera.current) clearTimeout(espera.current); }, []);
  function guardar(textoEscrito: string) {
    const d = diasValidos(textoEscrito);
    if (d === null) { setMal(true); return; }
    setMal(false);
    if (d !== guardados) alGuardar(d);
  }
  function paso(delta: number) {
    const base = diasValidos(escrito) ?? guardados ?? DIAS_MIN;
    const nuevo = String(Math.min(DIAS_MAX, Math.max(DIAS_MIN, base + delta)));
    setEscrito(nuevo); setMal(false);
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => guardar(nuevo), ESPERA_DE_LOS_DIAS_MS);
  }
  return (
    <div className={`cfg-numero ${mal ? "cfg-mal" : ""}`}>
      <button type="button" className="paso" aria-label="Un día menos" disabled={apagado} onClick={() => paso(-1)} data-testid="sis-vinculo-menos">−</button>
      <input inputMode="numeric" aria-labelledby="sis-vinculo" aria-invalid={mal} value={escrito} disabled={apagado}
        onChange={(e) => { setEscrito(e.target.value.replace(/\D/g, "")); setMal(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); guardar(escrito); } }}
        onBlur={() => { if (!apagado) guardar(escrito); }} data-testid="sis-vinculo" />
      <button type="button" className="paso" aria-label="Un día más" disabled={apagado} onClick={() => paso(1)} data-testid="sis-vinculo-mas">+</button>
      <span className="unidad">días</span>
      {mal
        ? <span className="cfg-error" role="alert" data-testid="sis-vinculo-error">Puede ir de {DIAS_MIN} a {DIAS_MAX} días. No se guardó{guardados !== undefined ? `: sigue en ${guardados}` : ""}.</span>
        : <span className="rango">de {DIAS_MIN} a {DIAS_MAX}</span>}
    </div>
  );
}
