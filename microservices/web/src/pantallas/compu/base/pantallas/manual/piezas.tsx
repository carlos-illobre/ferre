import { useRef, useState, type ReactNode } from "react";

// Las piezas con que se escribe cada capítulo del manual de uso (specs/012-manual-de-uso): notas,
// pasos numerados, capturas con sus marcas y clips. Las capturas y los clips están en
// public/manual/<capítulo>/ y los arma tests/capturas/tutorial/ con la aplicación de verdad.
export const ARCHIVOS = `${import.meta.env.BASE_URL}manual/`;

// El manual muestra lo de un dispositivo por vez, el que se elige arriba del índice (decisión 109).
export type Dispositivo = "compu" | "celu";

// El índice no usa enlaces con «#»: en esta aplicación el «#» es la dirección de la pantalla. Al
// elegir una sección, el foco va a su título, para seguir leyendo desde ahí con el teclado.
export const irASeccion = (id: string) => {
  const titulo = document.getElementById(id);
  titulo?.scrollIntoView({ behavior: "smooth", block: "start" });
  titulo?.focus({ preventScroll: true });
};

export function Nota({ tipo, children }: { tipo: "importante" | "consejo"; children: ReactNode }) {
  return (
    <div className={`manual-nota ${tipo}`}>
      {tipo === "importante"
        ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 4 2.7 17.5A2 2 0 0 0 4.4 20.5h15.2a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z" /></svg>
        : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z" /></svg>}
      <p>{children}</p>
    </div>
  );
}

export function Paso({ numero, titulo, children, celular }: { numero: number; titulo: ReactNode; children: ReactNode; celular?: ReactNode }) {
  return (
    <section className="manual-paso" data-testid="manual-paso">
      <div className="manual-numero" aria-hidden="true">{numero}</div>
      <div className={celular ? "manual-lado" : undefined}>
        <div><h3><span className="solo-lectores">Paso {numero}: </span>{titulo}</h3>{children}</div>
        {celular}
      </div>
    </section>
  );
}

// Una marca numerada sobre una captura, en porcentaje de la imagen: un punto sobre lo que se mira
// o, con ancho y alto, un recuadro alrededor de lo que se toca, con el número en su borde derecho.
// Las posiciones y las leyendas las escribe el recorrido de tests/capturas/tutorial/ al sacar las
// capturas, en manual-<capítulo>-marcas.json.
export type Marca = { x: number; y: number; ancho?: number; alto?: number; texto: string };

// `doble`: la captura de una parte de la pantalla, sacada al doble de resolución; se ve a la mitad
// de su tamaño, para que se lea nítida.
export function Figura({ carpeta, captura, marcas, alt, numero, pie, celular, ancho, doble }: {
  carpeta: string; captura: string; marcas: Marca[]; alt: string; numero: string; pie: string; celular?: boolean; ancho?: number; doble?: boolean;
}) {
  const url = `${ARCHIVOS}${carpeta}/${captura}.png`;
  return (
    <figure className="manual-figura">
      <div className={`manual-imagen ${celular ? "celular" : ""}`} style={ancho ? { width: ancho } : undefined}>
        <img src={url} srcSet={doble ? `${url} 2x` : undefined} alt={alt} loading="lazy" />
        {marcas.map((m, i) => m.ancho !== undefined && m.alto !== undefined
          ? <span key={i} className="manual-recuadro" style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.ancho}%`, height: `${m.alto}%` }} aria-hidden="true"><span className="manual-marca">{i + 1}</span></span>
          : <span key={i} className="manual-marca" style={{ left: `${m.x}%`, top: `${m.y}%` }} aria-hidden="true">{i + 1}</span>)}
      </div>
      <ol className="manual-leyenda" data-testid="manual-leyenda">{marcas.map((m, i) => <li key={i}><span aria-hidden="true">{i + 1}</span>{m.texto}</li>)}</ol>
      <figcaption><b>Figura {numero}</b> · {pie}</figcaption>
    </figure>
  );
}

export function Clip({ carpeta, nombre, testId, etiqueta, celular, chico, children }: { carpeta: string; nombre: string; testId: string; etiqueta: string; celular?: boolean; chico?: boolean; children: ReactNode }) {
  const video = useRef<HTMLVideoElement>(null);
  const [andando, setAndando] = useState(false);
  const [duracion, setDuracion] = useState<string | null>(null);
  const alCargar = () => { const d = video.current?.duration; if (d && Number.isFinite(d)) setDuracion(`${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, "0")}`); };
  return (
    <figure className={`manual-clip${chico ? " chico" : ""}${celular ? " celu" : ""}`}>
      <div className="manual-video">
        {duracion && !andando && <span className="manual-duracion" aria-hidden="true">▶ {duracion}</span>}
        {!andando && (
          <button type="button" className="manual-play" onClick={() => void video.current?.play()} aria-label={`Ver el clip: ${etiqueta.replace(/^Clip: /, "")}`} data-testid={`${testId}-play`}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
          </button>
        )}
        <video ref={video} src={`${ARCHIVOS}${carpeta}/${nombre}.mp4`} poster={`${ARCHIVOS}${carpeta}/${nombre}-portada.jpg`} controls muted playsInline preload="metadata" data-testid={testId} aria-label={etiqueta}
          onLoadedMetadata={alCargar} onPlay={() => setAndando(true)} onPause={() => setAndando(false)} onEnded={() => setAndando(false)} />
      </div>
      <figcaption>{children} <span>Sin sonido</span></figcaption>
    </figure>
  );
}

export const Boton = ({ children }: { children: ReactNode }) => <span className="manual-boton-ui">{children}</span>;
export const Tecla = ({ children }: { children: ReactNode }) => <kbd className="tecla">{children}</kbd>;
export const Titulo = ({ id, children }: { id: string; children: ReactNode }) => <h2 id={id} tabIndex={-1}>{children}</h2>;

// Las tarjetas de «¿Qué querés hacer?» o «¿Cuál uso?»: cada una lleva a su sección.
export function Tarjetas({ tarjetas, testId }: { tarjetas: { id: string; nombre: string; detalle: string }[]; testId: string }) {
  return (
    <div className="manual-formas" data-testid={testId}>
      {tarjetas.map((f) => (
        <button key={f.id} type="button" className="manual-forma" onClick={() => irASeccion(f.id)}>
          <strong>{f.nombre}</strong><span>{f.detalle}</span>
        </button>
      ))}
    </div>
  );
}
