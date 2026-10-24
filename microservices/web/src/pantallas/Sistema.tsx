import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { diasValidos, DIAS_MAX, DIAS_MIN, nombreDelTramo, useAjustesDelSistema } from "../negocio/sistema/ajustes";
import { TEXTOS, texto } from "./textos";
import "./configuracion.css";

// Más → Sistema (specs/020, RF-135): lo que vale para todos los dispositivos, que fija quien
// tiene «Administrar el sistema». Una sola pantalla para el celular y la computadora, con las
// piezas de Configuración: los tiempos se eligen entre tramos y se guardan al tocar (decisión
// 147); los días del vínculo se escriben, con − y +.
const t = TEXTOS.sistema;
const ESPERA_DE_LOS_DIAS_MS = 700; // − y + seguidos se guardan juntos

export function Sistema({ celular = false }: { celular?: boolean }) {
  const { ajustes, sinConexion, error, guardado, cambiar } = useAjustesDelSistema();
  const x = (cual: { largo: string; corto: string }) => texto(cual, celular);
  const apagado = sinConexion || !ajustes;
  return (
    <main id="contenido" className={celular ? "contenido cfg" : "pagina cfg"} tabIndex={-1} data-testid="sistema">
      <header className={celular ? "encabezado" : "pagina-cabeza"}>
        <h1 className={celular ? "titulo" : undefined}>Sistema</h1>
        <p className={celular ? "cfg-bajada" : "bajada"}>{x(t.bajada)}</p>
      </header>
      {sinConexion && <p className="cfg-sin-red" role="status" data-testid="sistema-sin-conexion">{x(t.sinConexion)}</p>}
      {error && <p className="cfg-sin-red cfg-rechazo" role="alert" data-testid="sistema-error">{error}</p>}
      <ul className="cfg-lista">
        <li className="cfg-fila cfg-sistema">
          <span className="cfg-nombre" id="sis-sesion">{x(t.sesion)}</span>
          <span className="cfg-detalle">{x(t.sesionDetalle)}</span>
          <Tramos etiqueta="sis-sesion" tramos={ajustes?.tramos.sesion_segundos ?? []} elegido={ajustes?.sesion_segundos} apagado={apagado}
            alElegir={(s) => void cambiar({ sesion_segundos: s })} testId="sis-sesion" />
        </li>
        <li className="cfg-fila cfg-sistema">
          <span className="cfg-nombre" id="sis-celular">{x(t.celular)}</span>
          <span className="cfg-detalle">{x(t.celularDetalle)}</span>
          <Tramos etiqueta="sis-celular" tramos={ajustes?.tramos.celular_segundos ?? []} elegido={ajustes?.celular_segundos} apagado={apagado}
            alElegir={(s) => void cambiar({ celular_segundos: s })} testId="sis-celular" />
        </li>
        <li className="cfg-fila cfg-sistema">
          <span className="cfg-nombre" id="sis-vinculo">{x(t.vinculo)}</span>
          <span className="cfg-detalle">{x(t.vinculoDetalle)}</span>
          <Dias guardados={ajustes?.vinculo_dias} apagado={apagado} alGuardar={(d) => void cambiar({ vinculo_dias: d })} />
        </li>
      </ul>
      <p className="cfg-nota" data-testid="sistema-nota">
        {guardado ? <><span className="cfg-hecho" role="status">✓ Guardado para todos: {guardado}.</span>{x(t.llegaEnUnMinuto)}</> : x(t.nota)}
      </p>
    </main>
  );
}

// Los tramos de un tiempo, como «Buscar versión nueva»: tocar uno lo guarda. Con el teclado, ← →
// recorren los tramos y Enter o espacio elige.
function Tramos({ etiqueta, tramos, elegido, apagado, alElegir, testId }: { etiqueta: string; tramos: number[]; elegido: number | undefined; apagado: boolean; alElegir: (s: number) => void; testId: string }) {
  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault(); e.stopPropagation();
    const botones = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
    const i = botones.indexOf(document.activeElement as HTMLButtonElement);
    botones[Math.min(botones.length - 1, Math.max(0, i + (e.key === "ArrowRight" ? 1 : -1)))]?.focus();
  }
  return (
    <div className={`cfg-tramos ${apagado ? "apagados" : ""}`} role="radiogroup" aria-labelledby={etiqueta} style={{ gridTemplateColumns: `repeat(${Math.max(tramos.length, 1)}, 1fr)` }} onKeyDown={teclas} data-testid={testId}>
      {tramos.map((s) => (
        <button key={s} type="button" role="radio" aria-checked={elegido === s} className={elegido === s ? "elegido" : ""} disabled={apagado}
          onClick={() => { if (s !== elegido) alElegir(s); }} data-testid={`${testId}-${s}`}>{nombreDelTramo(s)}</button>
      ))}
    </div>
  );
}

// Los días del vínculo: el número, con − y +. Se guarda al dejar de tocar − o +, y al terminar de
// escribirlo (Enter o salir de la caja). Fuera de 1 a 365 no se guarda y lo dice.
function Dias({ guardados, apagado, alGuardar }: { guardados: number | undefined; apagado: boolean; alGuardar: (d: number) => void }) {
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
