import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { irA } from "../rutas";
import { Logotipo } from "../../../Logotipo";
import MARCAS from "./manual-entrar-marcas.json";
import "../estilos/manual.css";

// El manual de uso (RF-97, specs/012-manual-de-uso): lo abre «Ver tutorial» en la entrada de la
// computadora, sin sesión y en la misma pestaña. Un capítulo por pantalla principal; los que faltan
// escribir dicen «pronto». El marco copia maquetas/manual-marco.html y el capítulo «Entrar»,
// maquetas/manual-entrar-v2.html (las dos aprobadas). Las capturas y
// el clip están en public/manual/<capítulo>/ y los arma tests/capturas/tutorial/<capítulo>.py con la
// aplicación de verdad; no se guardan para usar sin conexión.
const ARCHIVOS = `${import.meta.env.BASE_URL}manual/`;

export const CAPITULOS: { nombre: string; escrito?: boolean; secciones?: { id: string; nombre: string }[] }[] = [
  { nombre: "Entrar", escrito: true, secciones: [
    { id: "cual", nombre: "¿Cuál uso?" },
    { id: "compu-celular", nombre: "Computadora: con el celular" },
    { id: "compu-google", nombre: "Computadora: con Google" },
    { id: "compu-huella", nombre: "Computadora: con la huella" },
    { id: "celu-google", nombre: "Celular: con Google" },
    { id: "celu-huella", nombre: "Celular: con la huella" },
    { id: "problemas", nombre: "Si algo no funciona" },
  ] },
  { nombre: "Catálogo" },
  { nombre: "Vender" },
  { nombre: "Cómo va el negocio" },
  { nombre: "Usuarios" },
  { nombre: "Anomalías" },
  { nombre: "Procesos" },
  { nombre: "Mejoras y errores" },
  { nombre: "Configuración" },
];

// El índice no usa enlaces con «#»: en esta aplicación el «#» es la dirección de la pantalla. Al
// elegir una sección, el foco va a su título, para seguir leyendo desde ahí con el teclado.
const irASeccion = (id: string) => {
  const titulo = document.getElementById(id);
  titulo?.scrollIntoView({ behavior: "smooth", block: "start" });
  titulo?.focus({ preventScroll: true });
};
const irAlInicio = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById("contenido")?.focus({ preventScroll: true });
};

// La sección que se lee: la última cuyo título ya pasó por debajo de la barra de arriba.
function useSeccionQueSeLee(ids: string[]): string {
  const [actual, setActual] = useState(ids[0] ?? "");
  useEffect(() => {
    const mirar = () => {
      let leida = ids[0] ?? "";
      for (const id of ids) { const t = document.getElementById(id); if (t && t.getBoundingClientRect().top < 160) leida = id; }
      setActual(leida);
    };
    mirar();
    window.addEventListener("scroll", mirar, { passive: true });
    return () => window.removeEventListener("scroll", mirar);
  }, [ids]);
  return actual;
}

export function Manual() {
  const capitulo = CAPITULOS[0]!;
  const secciones = capitulo.secciones ?? [];
  const [ids] = useState(() => secciones.map((x) => x.id));
  const actual = useSeccionQueSeLee(ids);
  return (
    <div className="manual" data-testid="manual">
      <header className="manual-barra">
        <span className="manual-logo"><Logotipo sobre="oscuro" /></span>
        <span className="manual-titulo"><strong>Manual de uso</strong><small>Aprendé a tu ritmo, sin complicaciones</small></span>
        <Buscador />
        <button type="button" className="manual-volver" onClick={() => irA("")} data-testid="manual-volver">← Volver a Ferrebress</button>
      </header>
      <div className="manual-marco">
        <nav className="manual-indice" aria-label="Capítulos">
          <button type="button" className="manual-inicio" onClick={irAlInicio} data-testid="manual-inicio">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" /></svg>Inicio del manual
          </button>
          <h2>Capítulos</h2>
          <ol>
            {CAPITULOS.map((c, i) => (
              <li key={c.nombre} className={c.escrito ? "actual" : "pronto"} data-testid="manual-capitulo">
                {c.escrito
                  ? <button type="button" onClick={irAlInicio} aria-current="page"><b>{i + 1}</b>{c.nombre}</button>
                  : <span aria-disabled="true"><b>{i + 1}</b>{c.nombre}<em>pronto</em></span>}
                {c.secciones && (
                  <ul className="manual-secciones">{c.secciones.map((x) => (
                    <li key={x.id} className={x.id === actual ? "actual" : undefined}>
                      <button type="button" onClick={() => irASeccion(x.id)} aria-current={x.id === actual ? "location" : undefined}>{x.nombre}</button>
                    </li>
                  ))}</ul>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <main className="manual-hoja" id="contenido" tabIndex={-1}>
          <nav className="manual-migas" aria-label="Estás en" data-testid="manual-migas">
            <button type="button" onClick={irAlInicio}>Manual de uso</button><span aria-hidden="true">›</span>
            <button type="button" onClick={irAlInicio}>1. {capitulo.nombre}</button><span aria-hidden="true">›</span>
            <b>{TITULO_DE_SECCION[actual] ?? ""}</b>
          </nav>
          <CapituloEntrar />
          <nav className="manual-pie">
            <span>Este es el primer capítulo</span>
            <span>Siguiente: {CAPITULOS[1]?.nombre} (pronto) →</span>
          </nav>
        </main>
        <aside className="manual-derecha" aria-label="Para seguir">
          <div className="manual-caja manual-consejo">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z" /></svg>
            <div><strong>Consejo</strong><p>Con Ferrebress abierto en el celular, entrás a la computadora en segundos: tocá «Vincular» y apuntá al código.</p></div>
          </div>
          <div className="manual-caja">
            <h2>Artículos relacionados</h2>
            {RELACIONADOS.map((r) => (
              <button key={r.id} type="button" className="manual-relacionado" onClick={() => irASeccion(r.id)}>
                <span className="manual-relacionado-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><path d={r.icono} /></svg></span>
                <span><strong>{r.titulo}</strong><small>{r.detalle}</small></span>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="manual-relacionado-flecha"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

// Cómo se llama cada sección del capítulo, para las migas de pan.
const TITULO_DE_SECCION: Record<string, string> = {
  cual: "¿Cuál uso?", "compu-celular": "En la computadora, con el celular", "compu-google": "En la computadora, con Google",
  "compu-huella": "En la computadora, con la huella", "celu-google": "En el celular, con Google", "celu-huella": "En el celular, con la huella",
  problemas: "Si algo no funciona",
};

const RELACIONADOS = [
  { id: "problemas", titulo: "Si algo no funciona", detalle: "Qué hacer si no podés entrar.", icono: "M12 9v4M12 17h.01M10.3 4 2.7 17.5A2 2 0 0 0 4.4 20.5h15.2a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z" },
  { id: "celu-huella", titulo: "Entrar con la huella", detalle: "La forma más rápida en el celular.", icono: "M12 11v3a6 6 0 0 1-1.2 3.6M8.5 9.5a4 4 0 0 1 7 2.5v1.5M6 13v-1a6 6 0 0 1 10.8-3.6M15.5 17.5c.3-1 .5-2 .5-3" },
  { id: "compu-google", titulo: "Entrar con tu cuenta de Google", detalle: "Si no tenés el celular a mano.", icono: "M21 12a9 9 0 1 1-2.6-6.4M12 12h9" },
];

// El buscador del manual: busca en lo que está escrito en la hoja (títulos, pasos, notas, la tabla),
// sin importar mayúsculas ni tildes. Ctrl+F lo abre en lugar del buscar del navegador.
type Encontrado = { elemento: HTMLElement; ruta: string; titulo: string; texto: string };
const plano = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const MAXIMO = 6;

function buscarEnLaHoja(texto: string): Encontrado[] {
  const buscado = plano(texto.trim());
  const hoja = document.querySelector<HTMLElement>("[data-testid=manual-entrar]");
  if (buscado.length < 2 || !hoja) return [];
  const encontrados: Encontrado[] = [];
  const vistos = new Set<unknown>();
  const sinPaso = (t: string) => t.replace(/^Paso \d+: /, "");
  let seccion = "";
  for (const e of hoja.querySelectorAll<HTMLElement>("h2, h3, p, td, .manual-forma, .manual-leyenda li")) {
    if (e.tagName === "H2") seccion = e.textContent ?? "";
    const forma = e.closest<HTMLElement>(".manual-forma");
    if (forma && e !== forma) continue;
    // Un resultado por paso, por tarjeta, por renglón de la tabla y, lo demás, por sección: el primero que coincide.
    const grupo = e.closest(".manual-paso") ?? forma ?? e.closest("tr") ?? `seccion:${seccion}`;
    if (encontrados.length >= MAXIMO || vistos.has(grupo) || !plano(e.textContent ?? "").includes(buscado)) continue;
    vistos.add(grupo);
    const paso = e.closest(".manual-paso")?.querySelector("h3")?.textContent;
    const ruta = seccion && e.tagName !== "H2" ? `Entrar › ${seccion}` : "Entrar";
    let titulo: string, detalle = "";
    if (forma) { titulo = `${forma.querySelector("small")?.textContent ?? ""}, ${(forma.querySelector("strong")?.textContent ?? "").toLowerCase()}`; detalle = forma.querySelector("span")?.textContent ?? ""; }
    else if (e.tagName === "H2" || e.tagName === "H3") titulo = sinPaso(e.textContent ?? "");
    else if (paso) { titulo = sinPaso(paso); detalle = e.textContent ?? ""; }
    else if (e.tagName === "TD") { titulo = e.closest("tr")?.firstElementChild?.textContent ?? seccion; detalle = e === e.closest("tr")?.firstElementChild ? "" : (e.textContent ?? ""); }
    else { titulo = seccion || "Entrar a Ferrebress"; detalle = e.textContent ?? ""; }
    encontrados.push({ elemento: forma ?? e, ruta, titulo, texto: detalle });
  }
  return encontrados;
}

function Resaltado({ texto, buscado }: { texto: string; buscado: string }) {
  const desde = plano(texto).indexOf(plano(buscado.trim()));
  if (desde < 0 || !buscado.trim()) return <>{texto}</>;
  const hasta = desde + buscado.trim().length;
  return <>{texto.slice(0, desde)}<mark>{texto.slice(desde, hasta)}</mark>{texto.slice(hasta)}</>;
}
const recortar = (texto: string, buscado: string) => {
  const desde = Math.max(0, plano(texto).indexOf(plano(buscado.trim())) - 40);
  return (desde > 0 ? "…" : "") + texto.slice(desde, desde + 110) + (texto.length > desde + 110 ? "…" : "");
};

function Buscador() {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(0);
  const caja = useRef<HTMLInputElement>(null);
  const resultados = abierto ? buscarEnLaHoja(texto) : [];
  useEffect(() => {
    const alTeclear = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); caja.current?.focus(); caja.current?.select(); setAbierto(true); }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);
  function ir(r: Encontrado) {
    setAbierto(false);
    r.elemento.scrollIntoView({ behavior: "smooth", block: "center" });
    if (!r.elemento.hasAttribute("tabindex")) r.elemento.setAttribute("tabindex", "-1");
    r.elemento.focus({ preventScroll: true });
    r.elemento.classList.add("manual-encontrado");
    setTimeout(() => r.elemento.classList.remove("manual-encontrado"), 2000);
  }
  function alTeclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { setAbierto(false); caja.current?.blur(); }
    else if (e.key === "ArrowDown" && resultados.length) { e.preventDefault(); setActiva((i) => (i + 1) % resultados.length); }
    else if (e.key === "ArrowUp" && resultados.length) { e.preventDefault(); setActiva((i) => (i <= 0 ? resultados.length : i) - 1); }
    else if (e.key === "Enter" && resultados[activa]) { e.preventDefault(); ir(resultados[activa]); }
  }
  return (
    <div className={`manual-buscar${abierto ? " abierto" : ""}`}>
      <label>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <input ref={caja} value={texto} placeholder="Buscar en el manual…" aria-label="Buscar en el manual" role="combobox" aria-expanded={resultados.length > 0}
          aria-controls="manual-resultados" aria-autocomplete="list" aria-activedescendant={resultados.length ? `manual-resultado-${activa}` : undefined}
          onChange={(e) => { setTexto(e.target.value); setAbierto(true); setActiva(0); }} onFocus={() => setAbierto(true)} onBlur={() => setAbierto(false)} onKeyDown={alTeclear} data-testid="manual-buscar" />
        <kbd>Ctrl + F</kbd>
      </label>
      {resultados.length > 0 && (
        <ol className="manual-resultados" id="manual-resultados" role="listbox" aria-label="Resultados">
          {resultados.map((r, i) => (
            <li key={i} id={`manual-resultado-${i}`} role="option" aria-selected={i === activa} className={i === activa ? "activa" : undefined}
              onMouseDown={(e) => e.preventDefault()} onClick={() => ir(r)} data-testid="manual-resultado">
              <span className="manual-resultado-ruta">{r.ruta}</span>
              <strong><Resaltado texto={r.titulo} buscado={texto} /></strong>
              {r.texto && <small><Resaltado texto={recortar(r.texto, texto)} buscado={texto} /></small>}
            </li>
          ))}
        </ol>
      )}
      {abierto && texto.trim().length >= 2 && resultados.length === 0 && <p className="manual-resultados vacio" role="status">No hay nada con «{texto}».</p>}
    </div>
  );
}

function Nota({ tipo, children }: { tipo: "importante" | "consejo"; children: ReactNode }) {
  return (
    <div className={`manual-nota ${tipo}`}>
      {tipo === "importante"
        ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 4 2.7 17.5A2 2 0 0 0 4.4 20.5h15.2a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z" /></svg>
        : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z" /></svg>}
      <p>{children}</p>
    </div>
  );
}

function Paso({ numero, titulo, children, celular }: { numero: number; titulo: string; children: ReactNode; celular?: ReactNode }) {
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
// Las posiciones y las leyendas las escribe tests/capturas/tutorial/formas_de_entrar.py en
// manual-entrar-marcas.json, al sacar las capturas.
type Marca = { x: number; y: number; ancho?: number; alto?: number; texto: string };
type Captura = keyof typeof MARCAS;

function Figura({ captura, alt, numero, pie, celular, ancho }: { captura: Captura; alt: string; numero: string; pie: string; celular?: boolean; ancho?: number }) {
  const marcas: Marca[] = MARCAS[captura];
  return (
    <figure className="manual-figura">
      <div className={`manual-imagen ${celular ? "celular" : ""}`} style={ancho ? { width: ancho } : undefined}>
        <img src={`${ARCHIVOS}entrar/${captura}.png`} alt={alt} loading="lazy" />
        {marcas.map((m, i) => m.ancho !== undefined && m.alto !== undefined
          ? <span key={i} className="manual-recuadro" style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.ancho}%`, height: `${m.alto}%` }} aria-hidden="true"><span className="manual-marca">{i + 1}</span></span>
          : <span key={i} className="manual-marca" style={{ left: `${m.x}%`, top: `${m.y}%` }} aria-hidden="true">{i + 1}</span>)}
      </div>
      <ol className="manual-leyenda" data-testid="manual-leyenda">{marcas.map((m, i) => <li key={i}><span aria-hidden="true">{i + 1}</span>{m.texto}</li>)}</ol>
      <figcaption><b>Figura {numero}</b> · {pie}</figcaption>
    </figure>
  );
}

function Clip({ nombre, testId, etiqueta, celular, chico, children }: { nombre: string; testId: string; etiqueta: string; celular?: boolean; chico?: boolean; children: ReactNode }) {
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
        <video ref={video} src={`${ARCHIVOS}entrar/${nombre}.mp4`} poster={`${ARCHIVOS}entrar/${nombre}-portada.jpg`} controls muted playsInline preload="metadata" data-testid={testId} aria-label={etiqueta}
          onLoadedMetadata={alCargar} onPlay={() => setAndando(true)} onPause={() => setAndando(false)} onEnded={() => setAndando(false)} />
      </div>
      <figcaption>{children} <span>Sin sonido</span></figcaption>
    </figure>
  );
}

const Boton = ({ children }: { children: ReactNode }) => <span className="manual-boton-ui">{children}</span>;

// Las formas de entrar, para elegir: cada una lleva a su sección.
const FORMAS = [
  { id: "compu-celular", donde: "En la computadora", nombre: "Con el celular", cuando: "La más rápida. La computadora muestra un código y el celular lo lee." },
  { id: "compu-google", donde: "En la computadora", nombre: "Con Google", cuando: "Si no tenés el celular a mano." },
  { id: "compu-huella", donde: "En la computadora", nombre: "Con la huella", cuando: "Solo si la computadora tiene lector de huella." },
  { id: "celu-google", donde: "En el celular", nombre: "Con Google", cuando: "La primera vez que usás Ferrebress en ese celular." },
  { id: "celu-huella", donde: "En el celular", nombre: "Con la huella", cuando: "Todas las veces siguientes. Un toque y el dedo." },
];

const Titulo = ({ id, children }: { id: string; children: ReactNode }) => <h2 id={id} tabIndex={-1}>{children}</h2>;

// El capítulo «Entrar» (012-T010, maqueta manual-entrar-v2.html): para el empleado de mostrador,
// una sección por cada forma de entrar, con frases cortas y una acción por paso.
function CapituloEntrar() {
  return (
    <article data-testid="manual-entrar">
      <p className="manual-capitulo">Capítulo 1</p>
      <h1>Entrar a Ferrebress</h1>
      <p className="manual-entrada">Ferrebress no tiene contraseñas. Entrás con el celular, con tu cuenta de Google o con la huella.</p>
      <Nota tipo="importante"><b>Antes de la primera vez:</b> pedile a un Administrador que agregue tu correo de Google en <b>Más → Usuarios</b>. Si no, Ferrebress no te deja entrar.</Nota>

      <Titulo id="cual">¿Cuál uso?</Titulo>
      <p>Elegí según dónde estés. Tocá una para ir directo.</p>
      <div className="manual-formas" data-testid="manual-formas">
        {FORMAS.map((f) => (
          <button key={f.id} type="button" className="manual-forma" onClick={() => irASeccion(f.id)}>
            <small>{f.donde}</small><strong>{f.nombre}</strong><span>{f.cuando}</span>
          </button>
        ))}
      </div>
      <Nota tipo="consejo"><b>Entrás una sola vez.</b> Ferrebress se acuerda de vos en ese celular o esa computadora. Te pide entrar de nuevo solo si tocás «Salir» o si pasan 90 días sin usarlo.</Nota>

      <Titulo id="compu-celular">En la computadora, con el celular</Titulo>
      <p>La computadora muestra un código. El celular lo lee y la computadora entra sola, con tu nombre.</p>
      <Clip nombre="clip-celular" testId="manual-clip" etiqueta="Clip: en el celular se toca Vincular, se apunta al código de la computadora y se la deja entrar; la computadora entra sola">
        <b>Mirá cómo se hace.</b> A la izquierda, la computadora; a la derecha, el celular.
      </Clip>
      <h3 className="manual-caso">Si en el celular ya tenés Ferrebress abierto</h3>
      <Paso numero={1} titulo="Abrí Ferrebress en la computadora">
        <p>Aparece el código. No toques nada.</p>
        <Figura captura="compu-codigo" alt="La entrada de la computadora, con el código para leer con el celular" numero="1.1" pie="La entrada de la computadora." />
      </Paso>
      <Paso numero={2} titulo="En el celular, tocá «Vincular»" celular={
        <Figura captura="celu-vincular" alt="El celular, con el botón Vincular arriba a la derecha" numero="1.2" pie="«Vincular», arriba a la derecha." celular />
      }>
        <p>Está arriba a la derecha, en cualquier pantalla. Se abre la cámara.</p>
      </Paso>
      <Paso numero={3} titulo="Apuntá al código" celular={
        <Figura captura="celu-camara" alt="La cámara del celular apuntando al código de la computadora" numero="1.3" pie="La cámara, leyendo el código." celular />
      }>
        <p>Apuntá la cámara al código de la computadora. Lo lee solo: no hay que sacar foto.</p>
      </Paso>
      <Paso numero={4} titulo="Tocá «Entrar en la computadora»" celular={
        <Figura captura="celu-dejar-entrar" alt="El celular pregunta si entrar en la computadora" numero="1.4" pie="La pregunta en el celular." celular />
      }>
        <p>El celular pregunta si dejás entrar a la computadora. Tocá <Boton>Entrar en la computadora</Boton>.</p>
      </Paso>
      <Paso numero={5} titulo="Listo">
        <p>En unos segundos la computadora entra con tu nombre. El celular avisa arriba.</p>
        <div className="manual-par">
          <Figura captura="compu-adentro" alt="La computadora, ya adentro de Ferrebress" numero="1.5" pie="La computadora, adentro." />
          <Figura captura="celu-despues" alt="El celular avisa que la computadora entró" numero="1.6" pie="El aviso." celular ancho={170} />
        </div>
      </Paso>
      <h3 className="manual-caso">Si en el celular todavía no entraste</h3>
      <Paso numero={1} titulo="Tocá «Escanear el código de la computadora»" celular={
        <Figura captura="celu-entrada-escanear" alt="La entrada del celular, con el botón para escanear el código de la computadora" numero="1.7" pie="La entrada del celular." celular />
      }>
        <p>Está en la entrada del celular.</p>
      </Paso>
      <Paso numero={2} titulo="Apuntá al código y poné la huella" celular={
        <Figura captura="celu-entrar-los-dos" alt="El celular ofrece entrar acá y en la computadora con la huella" numero="1.8" pie="Entrar en los dos, con la huella." celular />
      }>
        <p>Después de leer el código, tocá <Boton>Entrar acá y en la computadora</Boton> y poné la huella. Entran los dos a la vez.</p>
        <p>Si nunca usaste la huella en ese celular, tocá <Boton>Continuar con Google</Boton>.</p>
      </Paso>
      <Nota tipo="consejo"><b>De paso, quedan vinculados.</b> Lo que hacés en el celular aparece en la computadora: si cambiás de pantalla en uno, el otro va a la misma.</Nota>
      <Clip nombre="clip-espejo" testId="manual-clip-espejo" etiqueta="Clip: en el celular se toca Vender, Depósito y Catálogo, y la computadora va sola a cada una" chico>
        <b>Van juntos.</b> Se toca en el celular, a la derecha, y la computadora lo sigue.
      </Clip>

      <Titulo id="compu-google">En la computadora, con Google</Titulo>
      <p>Para entrar sin el celular.</p>
      <Clip nombre="clip-google-compu" testId="manual-clip-google-compu" etiqueta="Clip: en la computadora se hace clic en Continuar con Google y Ferrebress se abre">
        <b>Mirá cómo se hace.</b> La ventana de Google no aparece en el clip.
      </Clip>
      <Paso numero={1} titulo="Hacé clic en «Continuar con Google»">
        <p>Es el botón azul, debajo del código.</p>
        <Figura captura="compu-google" alt="La entrada de la computadora, con el botón Continuar con Google" numero="1.9" pie="El botón de Google." />
      </Paso>
      <Paso numero={2} titulo="Elegí tu cuenta">
        <p>Se abre una ventana de Google. Hacé clic en tu correo, el que te autorizaron.</p>
        <p>Si tu correo no aparece, hacé clic en «Usar otra cuenta» y escribí tu correo y la contraseña de Google.</p>
      </Paso>
      <Paso numero={3} titulo="Listo">
        <p>Ferrebress se abre. Abajo a la izquierda está tu nombre.</p>
      </Paso>

      <Titulo id="compu-huella">En la computadora, con la huella</Titulo>
      <p>Solo en una computadora con lector de huella que ya usaste para entrar con la huella.</p>
      <Paso numero={1} titulo="Hacé clic en «Entrar con la huella»">
        <p>Está arriba del botón de Google.</p>
        <Figura captura="compu-huella" alt="La entrada de la computadora, con el botón Entrar con la huella" numero="1.10" pie="El botón de la huella." />
      </Paso>
      <Paso numero={2} titulo="Poné el dedo en el lector">
        <p>La computadora te pide la huella (o el PIN de Windows). Ferrebress entra solo.</p>
      </Paso>
      <Nota tipo="consejo"><b>¿No aparece el botón?</b> Esa computadora todavía no tiene la huella. Entrá con Google y activala en <b>Más → Configuración</b>, en «Mis celulares con huella».</Nota>

      <Titulo id="celu-google">En el celular, con Google</Titulo>
      <p>La primera vez que usás Ferrebress en un celular.</p>
      <Clip nombre="clip-google-celu" testId="manual-clip-google-celu" etiqueta="Clip: en el celular se toca Continuar con Google, Ferrebress se abre y ofrece usar la huella" celular>
        <b>Mirá cómo se hace.</b> La ventana de Google no aparece en el clip.
      </Clip>
      <Paso numero={1} titulo="Tocá «Continuar con Google»" celular={
        <Figura captura="celu-google" alt="La entrada del celular, con el botón Continuar con Google" numero="1.11" pie="El botón de Google." celular />
      }>
        <p>Es el botón azul de arriba.</p>
      </Paso>
      <Paso numero={2} titulo="Elegí tu cuenta">
        <p>Google te muestra tus cuentas. Tocá la tuya, la que te autorizaron.</p>
      </Paso>
      <Paso numero={3} titulo="Activá la huella" celular={
        <Figura captura="celu-ofrecer-huella" alt="El celular pregunta si entrar con la huella" numero="1.12" pie="La pregunta de la huella." celular />
      }>
        <p>Ferrebress te pregunta si querés entrar con la huella. Tocá <Boton>Sí, usar la huella</Boton> y poné el dedo. La próxima vez entrás más rápido.</p>
      </Paso>

      <Titulo id="celu-huella">En el celular, con la huella</Titulo>
      <p>Todas las veces después de la primera.</p>
      <Paso numero={1} titulo="Tocá «Entrar con la huella»" celular={
        <Figura captura="celu-huella" alt="La entrada del celular, con el botón Entrar con la huella" numero="1.13" pie="El botón de la huella." celular />
      }>
        <p>Es el botón naranja.</p>
      </Paso>
      <Paso numero={2} titulo="Apoyá el dedo">
        <p>El teléfono te pide la huella, como cuando lo desbloqueás. Ferrebress se abre solo.</p>
      </Paso>

      <Titulo id="problemas">Si algo no funciona</Titulo>
      <table className="manual-problemas">
        <thead><tr><th>Qué pasa</th><th>Qué hacer</th></tr></thead>
        <tbody>
          <tr><td>Dice «No autorizado»</td><td>Tu correo no está autorizado. Pedile a un Administrador que lo agregue en <b>Más → Usuarios</b>, o probá con otra cuenta.</td></tr>
          <tr><td>El celular dice que el código venció</td><td>El código cambia cada 5 minutos. Leé el que está ahora en la pantalla.</td></tr>
          <tr><td>No aparece el código</td><td>La computadora no tiene internet. Cuando vuelva, el código aparece solo.</td></tr>
          <tr><td>No se pudo leer la huella</td><td>Probá de nuevo, o entrá con Google.</td></tr>
          <tr><td>Dice «Este dispositivo no está vinculado»</td><td>En ese celular o computadora nunca activaste la huella. Entrá con Google.</td></tr>
          <tr><td>Dice «Hay que iniciar sesión»</td><td>Se cerró tu sesión en ese dispositivo. Entrá de nuevo.</td></tr>
        </tbody>
      </table>
      <Figura captura="compu-no-autorizado" alt="El aviso de correo no autorizado en la entrada de la computadora" numero="1.14" pie="Así se ve cuando el correo no está autorizado." ancho={420} />
    </article>
  );
}
