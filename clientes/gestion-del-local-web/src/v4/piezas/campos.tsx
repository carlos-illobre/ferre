import { forwardRef, useEffect, useId, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { MARGENES, numero } from "../formato";
import { clases } from "./basicas";
import { Icono } from "./Icono";

// ---------------------------------------------------------------- Campo

type PropsDeCampo = Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  etiqueta: string;
  /** Mensaje de error en el lugar: queda ligado al campo y lo marca en rojo. */
  error?: string | null;
  /** Una línea de ayuda debajo. */
  ayuda?: string;
  /** Texto fijo antes del valor, por ejemplo "$". */
  prefijo?: string;
  /** Texto fijo después del valor, por ejemplo "%" o "kilos". */
  sufijo?: string;
};

/** Etiqueta + entrada + error ligado. Acepta todo lo de `<input>` (`value`, `onChange`, `inputMode`, `data-testid`…) y `ref`. */
export const Campo = forwardRef<HTMLInputElement, PropsDeCampo>(function Campo({ etiqueta, error, ayuda, prefijo, sufijo, className, id, ...resto }, ref) {
  const propio = useId();
  const idCampo = id ?? propio;
  const idNota = `${idCampo}-nota`;
  return (
    <div className={clases("campo", error && "campo--con-error", className)}>
      <label className="campo__etiqueta" htmlFor={idCampo}>{etiqueta}</label>
      <div className="campo__caja">
        {prefijo && <span className="campo__fijo" aria-hidden="true">{prefijo}</span>}
        <input ref={ref} id={idCampo} className="campo__entrada" aria-invalid={error ? true : undefined} aria-describedby={error || ayuda ? idNota : undefined} autoComplete="off" {...resto} />
        {sufijo && <span className="campo__fijo" aria-hidden="true">{sufijo}</span>}
      </div>
      {error ? <p className="campo__error" id={idNota} role="alert">{error}</p> : ayuda ? <p className="campo__ayuda" id={idNota}>{ayuda}</p> : null}
    </div>
  );
});

/** Deja solo los dígitos de lo escrito y lo pasa a número (`"4.000"` → 4000); vacío → `null`. */
export function leerPesos(texto: string): number | null {
  const digitos = texto.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digitos === "" ? null : Number(digitos);
}

// ---------------------------------------------------------------- Buscador

type PropsDeBuscador = {
  valor: string;
  alCambiar: (texto: string) => void;
  /** Qué se busca, para quien no ve: «Buscar producto». */
  etiqueta: string;
  placeholder?: string;
  /** Si se pasa, aparece el botón de escanear de Figma a la derecha. */
  alEscanear?: () => void;
  /** Teclas dentro del campo (Enter, flechas). */
  alTeclear?: (evento: KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  /** `id` de la lista de resultados, si la hay (para lectores de pantalla). */
  controla?: string;
  /** `id` del resultado marcado con las flechas. */
  activo?: string;
  /** Por defecto `busqueda`. */
  testId?: string;
};

/** Acepta `ref` (llega a la entrada). */
export const Buscador = forwardRef<HTMLInputElement, PropsDeBuscador>(function Buscador({ valor, alCambiar, etiqueta, placeholder, alEscanear, alTeclear, autoFocus, controla, activo, testId = "busqueda" }, ref) {
  return (
    <div className="buscador">
      <Icono nombre="buscar" className="buscador__lupa" />
      <input
        ref={ref}
        className="buscador__entrada"
        type="text"
        inputMode="search"
        enterKeyHint="search"
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        onKeyDown={alTeclear}
        placeholder={placeholder}
        aria-label={etiqueta}
        aria-controls={controla}
        aria-activedescendant={activo}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        data-testid={testId}
      />
      {valor !== "" && (
        <button type="button" className="buscador__boton" aria-label="Borrar lo escrito" onClick={() => alCambiar("")}>
          <Icono nombre="cerrar" tam={20} />
        </button>
      )}
      {alEscanear && (
        <button type="button" className="buscador__boton buscador__boton--escanear" aria-label="Escanear un código de barras" onClick={alEscanear} data-testid="escanear">
          <Icono nombre="escanear" tam={24} />
        </button>
      )}
    </div>
  );
});

// ---------------------------------------------------------------- Cantidad

type PropsDeCantidad = {
  valor: number;
  alCambiar: (valor: number) => void;
  /** De qué es la cantidad, para quien no ve: «Cantidad de Mecha 6 mm madera». */
  etiqueta: string;
  /** Acepta un decimal (kilo, metro, litro). Sin esto, solo enteros. */
  decimal?: boolean;
  /** Lo menos que se puede poner. Por defecto 1 (0,1 con decimal). */
  minimo?: number;
  /** Cuánto suman y restan los botones. Por defecto 1 (0,5 con decimal). */
  paso?: number;
  /** `grande` para contar stock: número enorme y botones redondos, como en Figma. */
  tam?: "normal" | "grande";
  /** Va en la entrada. Por defecto `cantidad`. */
  testId?: string;
};

function aTexto(valor: number): string {
  return numero(valor).replace(/\./g, "");
}

/** − número +. El número también se puede escribir; nunca queda con un cero a la izquierda. */
export function Cantidad({ valor, alCambiar, etiqueta, decimal = false, minimo, paso, tam = "normal", testId = "cantidad" }: PropsDeCantidad) {
  const piso = minimo ?? (decimal ? 0.1 : 1);
  const salto = paso ?? (decimal ? 0.5 : 1);
  const [texto, setTexto] = useState(aTexto(valor));
  const [editando, setEditando] = useState(false);

  useEffect(() => { if (!editando) setTexto(aTexto(valor)); }, [valor, editando]);

  const redondear = (n: number) => Math.round(n * 10) / 10;
  const mover = (cuanto: number) => alCambiar(Math.max(piso, redondear(valor + cuanto)));

  function escribir(crudo: string) {
    // Sin decimales, lo que venga después de una coma o un punto se descarta («2,7» es 2).
    let limpio = crudo.replace(/\./g, ",").replace(decimal ? /[^\d,]/g : /,.*$|\D/g, "");
    if (decimal) {
      const [entero = "", ...decimales] = limpio.split(",");
      limpio = decimales.length ? `${entero},${decimales.join("").slice(0, 1)}` : entero;
    }
    limpio = limpio.replace(/^0+(?=\d)/, "");
    setTexto(limpio);
    const leido = Number(limpio.replace(",", "."));
    if (limpio !== "" && Number.isFinite(leido) && leido >= piso) alCambiar(redondear(leido));
  }

  return (
    <div className={`cantidad cantidad--${tam}`} role="group" aria-label={etiqueta}>
      <button type="button" className="cantidad__boton" aria-label="Uno menos" disabled={valor <= piso} onClick={() => mover(-salto)}>
        <Icono nombre="menos" tam={tam === "grande" ? 26 : 20} />
      </button>
      <input
        className="cantidad__numero"
        type="text"
        inputMode={decimal ? "decimal" : "numeric"}
        value={texto}
        aria-label={etiqueta}
        onFocus={(e) => { setEditando(true); e.target.select(); }}
        onBlur={() => setEditando(false)}
        onChange={(e) => escribir(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        data-testid={testId}
      />
      <button type="button" className="cantidad__boton" aria-label="Uno más" onClick={() => mover(salto)}>
        <Icono nombre="mas" tam={tam === "grande" ? 26 : 20} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- Segmentos

type Opcion<T extends string> = { clave: T; nombre: ReactNode };

type PropsDeSegmentos<T extends string> = {
  opciones: Opcion<T>[];
  elegido: T | null;
  alElegir: (clave: T) => void;
  /** Qué se está eligiendo, para quien no ve: «Cómo paga». */
  etiqueta: string;
  /** `fila` (por defecto) los pone uno al lado del otro; `grilla` de a dos, como los medios de pago de Figma. */
  forma?: "fila" | "grilla";
  /** Cada opción lleva `<testId>-<clave>`. */
  testId?: string;
};

/** Una opción entre pocas. La elegida queda marcada en naranja suave, como en Figma. */
export function Segmentos<T extends string>({ opciones, elegido, alElegir, etiqueta, forma = "fila", testId }: PropsDeSegmentos<T>) {
  return (
    <div className={`segmentos segmentos--${forma}`} role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.clave} type="button" className={clases("segmentos__opcion", elegido === o.clave && "segmentos__opcion--elegida")} aria-pressed={elegido === o.clave} onClick={() => alElegir(o.clave)} data-testid={testId ? `${testId}-${o.clave}` : undefined}>
          {o.nombre}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Margenes

type PropsDeMargenes = {
  /** El margen elegido en por ciento, o `null` si todavía no se eligió. */
  elegido: number | null;
  alElegir: (margen: number) => void;
  etiqueta?: string;
};

/** Los cinco botones de margen: 300, 200, 100, 50 y 25 %. Cada uno lleva `data-testid="margen-<n>"`. */
export function Margenes({ elegido, alElegir, etiqueta = "Margen" }: PropsDeMargenes) {
  return (
    <div className="segmentos segmentos--margenes" role="group" aria-label={etiqueta}>
      {MARGENES.map((m) => (
        <button key={m} type="button" className={clases("segmentos__opcion", elegido === m && "segmentos__opcion--elegida")} aria-pressed={elegido === m} onClick={() => alElegir(m)} data-testid={`margen-${m}`}>
          {m}&nbsp;%
        </button>
      ))}
    </div>
  );
}
