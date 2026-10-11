import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Boton, clases } from "./basicas";
import { Campo } from "./campos";
import { Icono } from "./Icono";

// ---------------------------------------------------------------- Hoja

type PropsDeHoja = {
  abierta: boolean;
  /** Se llama al cerrar con la cruz, con Escape o tocando afuera. */
  alCerrar: () => void;
  titulo: string;
  children: ReactNode;
  /** Botones fijos al pie de la hoja (quedan a la vista aunque el contenido sea largo). */
  pie?: ReactNode;
  /** `camara` es la hoja oscura del escáner. */
  variante?: "normal" | "camara";
};

const CAMPOS = "input:not([type=hidden]):not(:disabled), textarea:not(:disabled), select:not(:disabled)";

/**
 * Ventana sobre la pantalla: sube desde abajo en el celular y va centrada en la computadora.
 * Es un `<dialog>` nativo: cierra con Escape, oscurece el fondo y atrapa el foco.
 * Al abrirse, el foco va a lo que tenga `autoFocus` adentro; si no hay, al primer campo; y si
 * no hay campos, a la hoja misma. Nunca a la cruz (la barra espaciadora la cerraría).
 */
export function Hoja({ abierta, alCerrar, titulo, children, pie, variante = "normal" }: PropsDeHoja) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  // El contenido se monta recién con el diálogo abierto: así el `autoFocus` de adentro funciona.
  const [montada, setMontada] = useState(false);

  useLayoutEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
    setMontada(abierta);
  }, [abierta]);

  useLayoutEffect(() => {
    const c = caja.current;
    if (!montada || !c) return;
    const enfocado = document.activeElement;
    const respetar = enfocado instanceof HTMLElement && c.contains(enfocado) && enfocado !== c && !enfocado.classList.contains("hoja__cerrar");
    if (!respetar) (c.querySelector<HTMLElement>(`.hoja__cuerpo :is(${CAMPOS})`) ?? c).focus();
  }, [montada]);

  return (
    <dialog
      ref={dialogo}
      className={`hoja hoja--${variante}`}
      aria-labelledby={idTitulo}
      onClose={() => { if (abierta) alCerrar(); }}
      onClick={(e) => { if (e.target === dialogo.current) alCerrar(); }}
    >
      {abierta && montada && (
        <div className="hoja__caja" ref={caja} tabIndex={-1}>
          <header className="hoja__cabeza">
            <h2 id={idTitulo}>{titulo}</h2>
            <button type="button" className="hoja__cerrar" aria-label="Cerrar" onClick={alCerrar}><Icono nombre="cerrar" /></button>
          </header>
          <div className="hoja__cuerpo">{children}</div>
          {pie && <footer className="hoja__pie">{pie}</footer>}
        </div>
      )}
    </dialog>
  );
}

// ---------------------------------------------------------------- Confirmar

type PropsDeConfirmar = {
  abierta: boolean;
  /** La pregunta: «¿Anular la venta de $8.000?». */
  titulo: string;
  /** Qué va a pasar, y campos si hacen falta (un motivo). */
  children?: ReactNode;
  /** Texto del botón rojo: «Sí, anular». */
  confirmar: string;
  alConfirmar: () => void;
  alCancelar: () => void;
  cancelar?: string;
};

/** Solo para lo que no se puede recuperar: anular una venta, anular una compra, cerrar un conteo. */
export function Confirmar({ abierta, titulo, children, confirmar, alConfirmar, alCancelar, cancelar = "Volver" }: PropsDeConfirmar) {
  return (
    <Hoja abierta={abierta} alCerrar={alCancelar} titulo={titulo} pie={<>
      <Boton variante="secundario" onClick={alCancelar}>{cancelar}</Boton>
      <Boton variante="peligro" onClick={alConfirmar}>{confirmar}</Boton>
    </>}>
      {children}
    </Hoja>
  );
}

// ---------------------------------------------------------------- Explicado

type PropsDeExplicado = {
  /** El número ya formateado: `pesos(4000)`. */
  valor: string;
  /** Los pasos de la cuenta, en orden (los da `precioDeVenta` o `cuentaDeRenglon`). */
  pasos: string[];
  /** De qué es la cuenta: «Precio de Mecha 6 mm madera». */
  titulo?: string;
  className?: string;
};

/**
 * Un número que se toca y abre «De dónde sale» en pasos numerados. El disparador es un botón
 * en línea (vale dentro de un `<p>` o un `<span>`); la hoja se monta aparte, en `<body>`.
 */
export function Explicado({ valor, pasos, titulo = "De dónde sale", className }: PropsDeExplicado) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" className={clases("explicado", className)} onClick={() => setAbierto(true)} aria-label={`${valor}. Ver de dónde sale`}>{valor}</button>
      {abierto && createPortal(
        <Hoja abierta={abierto} alCerrar={() => setAbierto(false)} titulo={titulo}>
          <p className="explicado__valor">{valor}</p>
          <p className="explicado__ayuda">De dónde sale</p>
          <ol className="explicado__pasos">
            {pasos.map((paso, i) => <li key={i}><span>{paso}</span></li>)}
          </ol>
        </Hoja>,
        document.body,
      )}
    </>
  );
}

// ---------------------------------------------------------------- Escaner

type PropsDeEscaner = {
  abierto: boolean;
  alCerrar: () => void;
  /** Se llama con el código leído o escrito; después la hoja se cierra sola. */
  alLeer: (codigo: string) => void;
  /** Andamiaje de maqueta: códigos para simular que la cámara leyó algo. */
  ejemplos?: { codigo: string; nombre: string }[];
};

/** Pantalla de cámara simulada, con «O escribí el código». */
export function Escaner({ abierto, alCerrar, alLeer, ejemplos = [] }: PropsDeEscaner) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (abierto) { setCodigo(""); setError(null); } }, [abierto]);

  function leer(leido: string) { alLeer(leido); alCerrar(); }
  function enviar(e: FormEvent) {
    e.preventDefault();
    if (codigo.trim() === "") { setError("Escribí los números que están debajo de las barras."); return; }
    leer(codigo.trim());
  }

  return (
    <Hoja abierta={abierto} alCerrar={alCerrar} titulo="Escanear" variante="camara">
      <div className="escaner__camara" aria-hidden="true">
        <div className="escaner__marco"><span className="escaner__linea" /></div>
      </div>
      <p className="escaner__ayuda">Apuntá la cámara al código de barras. Se lee solo.</p>
      {ejemplos.length > 0 && (
        <div className="escaner__maqueta">
          <p>Maqueta: simular que la cámara leyó</p>
          {ejemplos.map((ej) => <button key={ej.codigo} type="button" onClick={() => leer(ej.codigo)}>{ej.nombre}</button>)}
        </div>
      )}
      <form className="escaner__a-mano" onSubmit={enviar} noValidate>
        <Campo etiqueta="O escribí el código" inputMode="numeric" value={codigo} error={error} onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, "")); setError(null); }} placeholder="Los números de abajo de las barras" />
        <Boton type="submit" variante="secundario">Usar este código</Boton>
      </form>
    </Hoja>
  );
}

// ---------------------------------------------------------------- QrDeMaqueta

/** Un código QR de mentira, dibujado en SVG, para las pantallas que muestran uno. */
export function QrDeMaqueta({ lado = 200, etiqueta = "Código para leer con la cámara del celular" }: { lado?: number; etiqueta?: string }) {
  const N = 25;
  const esOjo = (f: number, c: number) => (f < 8 && c < 8) || (f < 8 && c >= N - 8) || (f >= N - 8 && c < 8);
  const celdas: ReactNode[] = [];
  let semilla = 20261010;
  for (let f = 0; f < N; f++) {
    for (let c = 0; c < N; c++) {
      semilla = (semilla * 1103515245 + 12345) % 2147483648;
      if (!esOjo(f, c) && semilla % 100 < 47) celdas.push(<rect key={`${f}-${c}`} x={c} y={f} width="1.02" height="1.02" />);
    }
  }
  const ojo = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x + 0.5} y={y + 0.5} width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x={x + 2} y={y + 2} width="3" height="3" />
    </g>
  );
  return (
    <svg className="qr" width={lado} height={lado} viewBox="-2 -2 29 29" role="img" aria-label={etiqueta} shapeRendering="crispEdges">
      <rect x="-2" y="-2" width="29" height="29" fill="#fff" />
      <g fill="currentColor">{celdas}{ojo(0, 0)}{ojo(N - 7, 0)}{ojo(0, N - 7)}</g>
    </svg>
  );
}
