import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { irA } from "../rutas";
import { Logotipo } from "../../../Logotipo";
import { irASeccion, type Dispositivo } from "./manual/piezas";
import { CapituloEntrar, SECCIONES_DE_ENTRAR } from "./manual/Entrar";
import { CapituloCatalogo, SECCIONES_DE_CATALOGO } from "./manual/Catalogo";
import { CapituloCatalogoCelular, SECCIONES_DE_CATALOGO_CELULAR } from "./manual/CatalogoCelular";
import "../estilos/manual.css";

// El manual de uso (RF-97, specs/012-manual-de-uso): lo abre «Ver tutorial» en la entrada de la
// computadora, sin sesión y en la misma pestaña. Un capítulo por pantalla principal; los que faltan
// escribir dicen «pronto». El marco copia maquetas/manual-marco.html; arriba del índice se elige
// el dispositivo (maquetas/manual-dispositivo.html, decisión 109) y el manual muestra solo lo
// suyo. Cada capítulo está en manual/; las capturas y los clips, en public/manual/<capítulo>/, los
// arma tests/capturas/tutorial/ con la aplicación de verdad y no se guardan para usar sin conexión.
type Seccion = { id: string; nombre: string; de?: Dispositivo };
type Relacionado = { id: string; titulo: string; detalle: string; icono: string };
type Capitulo = {
  nombre: string;
  // Para qué dispositivos está escrito; sin esto, dice «pronto» en los dos.
  escrito?: { [d in Dispositivo]?: { contenido: () => ReactNode; consejo: string; relacionados: Relacionado[] } };
  secciones?: readonly Seccion[];
  testId?: string;
};

const ICONOS = {
  problema: "M12 9v4M12 17h.01M10.3 4 2.7 17.5A2 2 0 0 0 4.4 20.5h15.2a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z",
  huella: "M12 11v3a6 6 0 0 1-1.2 3.6M8.5 9.5a4 4 0 0 1 7 2.5v1.5M6 13v-1a6 6 0 0 1 10.8-3.6M15.5 17.5c.3-1 .5-2 .5-3",
  google: "M21 12a9 9 0 1 1-2.6-6.4M12 12h9",
  celular: "M7 2.5h10a2.5 2.5 0 0 1 2.5 2.5v14a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 19V5A2.5 2.5 0 0 1 7 2.5ZM11 18.5h2",
  porcentaje: "M19 5 5 19M6.5 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM17.5 15a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
  carrito: "M3 4h2l2.4 11h10.2L20 7H6.2M9 20h.01M17 20h.01",
  barras: "M4 6v12M8 6v12M12 6v12M16 6v12M20 6v12",
};

export const CAPITULOS: Capitulo[] = [
  { nombre: "Entrar", secciones: SECCIONES_DE_ENTRAR, testId: "manual-entrar", escrito: {
    compu: {
      contenido: () => <CapituloEntrar dispositivo="compu" />,
      consejo: "Con Ferrebress abierto en el celular, entrás a la computadora en segundos: tocá «Vincular» y apuntá al código.",
      relacionados: [
        { id: "problemas", titulo: "Si algo no funciona", detalle: "Qué hacer si no podés entrar.", icono: ICONOS.problema },
        { id: "compu-google", titulo: "Entrar con tu cuenta de Google", detalle: "Si no tenés el celular a mano.", icono: ICONOS.google },
        { id: "compu-celular", titulo: "Entrar con el celular", detalle: "La forma más rápida en la computadora.", icono: ICONOS.celular },
      ],
    },
    celu: {
      contenido: () => <CapituloEntrar dispositivo="celu" />,
      consejo: "Después de la primera vez, entrás con la huella: un toque y el dedo.",
      relacionados: [
        { id: "problemas", titulo: "Si algo no funciona", detalle: "Qué hacer si no podés entrar.", icono: ICONOS.problema },
        { id: "celu-huella", titulo: "Entrar con la huella", detalle: "La forma más rápida en el celular.", icono: ICONOS.huella },
        { id: "celu-google", titulo: "Entrar con Google", detalle: "La primera vez en ese celular.", icono: ICONOS.google },
      ],
    },
  } },
  { nombre: "Catálogo", secciones: [...SECCIONES_DE_CATALOGO, ...SECCIONES_DE_CATALOGO_CELULAR], testId: "manual-catalogo", escrito: {
    compu: {
      contenido: () => <CapituloCatalogo />,
      consejo: "Para encontrar rápido un producto, escribí solo una parte: con «mecha 6» aparecen todas las mechas de 6 mm.",
      relacionados: [
        { id: "cat-margen", titulo: "Poner el margen", detalle: "Para que tenga precio de venta.", icono: ICONOS.porcentaje },
        { id: "cat-agregar", titulo: "Agregar a la venta", detalle: "Sin ir a Vender.", icono: ICONOS.carrito },
        { id: "cat-codigo", titulo: "Cargar el código de barras", detalle: "Para encontrarlo escaneándolo.", icono: ICONOS.barras },
      ],
    },
    celu: {
      contenido: () => <CapituloCatalogoCelular />,
      consejo: "Para buscar más rápido, escaneá el código de barras: tocá el botón de las barras, al lado del buscador.",
      relacionados: [
        { id: "cat-escanear", titulo: "Buscar escaneando", detalle: "Con la cámara, sin escribir.", icono: ICONOS.barras },
        { id: "cat-margen", titulo: "Poner el margen", detalle: "Para que tenga precio de venta.", icono: ICONOS.porcentaje },
        { id: "cat-agregar", titulo: "Agregar a la venta", detalle: "Sin ir a Vender.", icono: ICONOS.carrito },
      ],
    },
  } },
  { nombre: "Vender" },
  { nombre: "Cómo va el negocio" },
  { nombre: "Usuarios" },
  { nombre: "Anomalías" },
  { nombre: "Procesos" },
  { nombre: "Mejoras y errores" },
  { nombre: "Configuración" },
];

const NOMBRE_DEL_DISPOSITIVO: Record<Dispositivo, string> = { compu: "Computadora", celu: "Celular" };
const escritoPara = (c: Capitulo, d: Dispositivo) => Boolean(c.escrito?.[d]);
const seccionesDe = (c: Capitulo, d: Dispositivo) => (c.secciones ?? []).filter((s) => !s.de || s.de === d);

// El dispositivo elegido se recuerda en esa computadora; si no se puede guardar, abre en Computadora.
const GUARDADO = "ferre.manual-dispositivo";
function leerDispositivo(): Dispositivo {
  try { return localStorage.getItem(GUARDADO) === "celu" ? "celu" : "compu"; } catch { return "compu"; }
}
function guardarDispositivo(d: Dispositivo) {
  try { localStorage.setItem(GUARDADO, d); } catch { /* sin almacenamiento: solo por esta vez */ }
}

const irAlInicio = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById("contenido")?.focus({ preventScroll: true });
};

// La sección que se lee: la última cuyo título ya pasó por debajo de la barra de arriba.
function useSeccionQueSeLee(ids: string[]): string {
  const [actual, setActual] = useState(ids[0] ?? "");
  const clave = ids.join(" ");
  useEffect(() => {
    const lista = clave.split(" ");
    const mirar = () => {
      let leida = lista[0] ?? "";
      for (const id of lista) { const t = document.getElementById(id); if (t && t.getBoundingClientRect().top < 160) leida = id; }
      setActual(leida);
    };
    mirar();
    window.addEventListener("scroll", mirar, { passive: true });
    return () => window.removeEventListener("scroll", mirar);
  }, [clave]);
  return actual;
}

export function Manual() {
  const [dispositivo, setDispositivo] = useState<Dispositivo>(leerDispositivo);
  const [elegido, setElegido] = useState(0);
  // Si el capítulo abierto no está escrito para el dispositivo, se abre el primero que sí.
  const numero = escritoPara(CAPITULOS[elegido]!, dispositivo) ? elegido : Math.max(0, CAPITULOS.findIndex((c) => escritoPara(c, dispositivo)));
  const capitulo = CAPITULOS[numero]!;
  const contenido = capitulo.escrito![dispositivo]!;
  const secciones = seccionesDe(capitulo, dispositivo);
  const actual = useSeccionQueSeLee(secciones.map((x) => x.id));
  const escritos = CAPITULOS.map((c, i) => ({ c, i })).filter(({ c }) => escritoPara(c, dispositivo));
  const posicion = escritos.findIndex(({ i }) => i === numero);
  const anterior = escritos[posicion - 1];
  const siguiente = CAPITULOS[numero + 1];

  function elegirDispositivo(d: Dispositivo) {
    setDispositivo(d);
    guardarDispositivo(d);
    window.scrollTo({ top: 0 });
  }
  function abrirCapitulo(i: number) {
    setElegido(i);
    window.scrollTo({ top: 0 });
    document.getElementById("contenido")?.focus({ preventScroll: true });
  }

  return (
    <div className="manual" data-testid="manual" data-dispositivo={dispositivo}>
      <header className="manual-barra">
        <span className="manual-logo"><Logotipo sobre="oscuro" /></span>
        <span className="manual-titulo"><strong>Manual de uso</strong><small>Aprendé a tu ritmo, sin complicaciones</small></span>
        <Buscador alAbrirCapitulo={setElegido} />
        <button type="button" className="manual-volver" onClick={() => irA("")} data-testid="manual-volver">← Volver a Ferrebress</button>
      </header>
      <div className="manual-marco">
        <nav className="manual-indice" aria-label="Capítulos">
          <SelectorDeDispositivo valor={dispositivo} alElegir={elegirDispositivo} />
          <h2>Capítulos</h2>
          <ol>
            {CAPITULOS.map((c, i) => {
              const escrito = escritoPara(c, dispositivo);
              return (
                <li key={c.nombre} className={i === numero ? "actual" : escrito ? "escrito" : "pronto"} data-testid="manual-capitulo">
                  {escrito
                    ? <button type="button" onClick={() => (i === numero ? irAlInicio() : abrirCapitulo(i))} aria-current={i === numero ? "page" : undefined}><b>{i + 1}</b>{c.nombre}</button>
                    : <span aria-disabled="true"><b>{i + 1}</b>{c.nombre}<em>pronto</em></span>}
                  {i === numero && (
                    <ul className="manual-secciones">{secciones.map((x) => (
                      <li key={x.id} className={x.id === actual ? "actual" : undefined}>
                        <button type="button" onClick={() => irASeccion(x.id)} aria-current={x.id === actual ? "location" : undefined}>{x.nombre}</button>
                      </li>
                    ))}</ul>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        <main className="manual-hoja" id="contenido" tabIndex={-1}>
          <nav className="manual-migas" aria-label="Estás en" data-testid="manual-migas">
            <button type="button" onClick={irAlInicio}>Manual de uso</button><span aria-hidden="true">›</span>
            <span className="manual-migas-dispositivo">{NOMBRE_DEL_DISPOSITIVO[dispositivo]}</span><span aria-hidden="true">›</span>
            <button type="button" onClick={irAlInicio}>{numero + 1}. {capitulo.nombre}</button><span aria-hidden="true">›</span>
            <b>{secciones.find((x) => x.id === actual)?.nombre ?? ""}</b>
          </nav>
          {/* Todos los capítulos escritos para el dispositivo están en la página, para que el buscador
              los encuentre; se ve solo el abierto. */}
          {escritos.map(({ c, i }) => (
            <article key={`${c.nombre}-${dispositivo}`} hidden={i !== numero} data-testid={c.testId} data-capitulo={i} data-nombre={c.nombre}>
              {c.escrito![dispositivo]!.contenido()}
            </article>
          ))}
          <nav className="manual-pie">
            {anterior ? <button type="button" onClick={() => abrirCapitulo(anterior.i)}>← Anterior: {anterior.c.nombre}</button> : <span>Este es el primer capítulo</span>}
            {siguiente && (escritoPara(siguiente, dispositivo)
              ? <button type="button" onClick={() => abrirCapitulo(numero + 1)}>Siguiente: {siguiente.nombre} →</button>
              : <span>Siguiente: {siguiente.nombre} (pronto) →</span>)}
          </nav>
        </main>
        <aside className="manual-derecha" aria-label="Para seguir">
          <div className="manual-caja manual-consejo">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z" /></svg>
            <div><strong>Consejo</strong><p data-testid="manual-consejo">{contenido.consejo}</p></div>
          </div>
          <div className="manual-caja">
            <h2>Artículos relacionados</h2>
            {contenido.relacionados.map((r) => (
              <button key={r.id} type="button" className="manual-relacionado" onClick={() => irASeccion(r.id)} data-testid="manual-relacionado">
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

// «¿Dónde lo usás?»: Computadora o Celular, como un grupo de opciones (con clic o con las flechas).
function SelectorDeDispositivo({ valor, alElegir }: { valor: Dispositivo; alElegir: (d: Dispositivo) => void }) {
  const opciones: { d: Dispositivo; icono: ReactNode }[] = [
    { d: "compu", icono: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></> },
    { d: "celu", icono: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></> },
  ];
  function flechas(e: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const otro: Dispositivo = valor === "compu" ? "celu" : "compu";
    alElegir(otro);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-dispositivo=${otro}]`)?.focus();
  }
  return (
    <div className="manual-donde">
      <span id="manual-donde-titulo">¿Dónde lo usás?</span>
      <div className="manual-donde-opciones" role="radiogroup" aria-labelledby="manual-donde-titulo" onKeyDown={flechas} data-testid="manual-dispositivo">
        {opciones.map(({ d, icono }) => (
          <button key={d} type="button" role="radio" aria-checked={valor === d} tabIndex={valor === d ? 0 : -1} onClick={() => alElegir(d)} data-dispositivo={d} data-testid={`manual-dispositivo-${d}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{icono}</svg>{NOMBRE_DEL_DISPOSITIVO[d]}
          </button>
        ))}
      </div>
    </div>
  );
}

// El buscador del manual: busca en lo que está escrito en los capítulos del dispositivo elegido
// (títulos, pasos, notas, las tablas), sin importar mayúsculas ni tildes. Ctrl+F lo abre en lugar
// del buscar del navegador. Elegir un resultado de otro capítulo lo abre.
type Encontrado = { elemento: HTMLElement; capitulo: number; ruta: string; titulo: string; texto: string };
const plano = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MAXIMO = 6;

function buscarEnElManual(texto: string): Encontrado[] {
  const buscado = plano(texto.trim());
  if (buscado.length < 2) return [];
  const encontrados: Encontrado[] = [];
  const vistos = new Set<unknown>();
  const sinPaso = (t: string) => t.replace(/^Paso \d+: /, "");
  for (const hoja of document.querySelectorAll<HTMLElement>(".manual-hoja article[data-capitulo]")) {
    const capitulo = Number(hoja.dataset.capitulo);
    const nombre = hoja.dataset.nombre ?? "";
    const tituloDelCapitulo = hoja.querySelector("h1")?.textContent ?? nombre;
    let seccion = "";
    for (const e of hoja.querySelectorAll<HTMLElement>("h2, h3, p, td, .manual-forma, .manual-leyenda li")) {
      if (e.tagName === "H2") seccion = e.textContent ?? "";
      const forma = e.closest<HTMLElement>(".manual-forma");
      if (forma && e !== forma) continue;
      // Un resultado por paso, por tarjeta, por renglón de una tabla y, lo demás, por sección: el primero que coincide.
      const grupo = e.closest(".manual-paso") ?? forma ?? e.closest("tr") ?? `${capitulo}:${seccion}`;
      if (encontrados.length >= MAXIMO || vistos.has(grupo) || !plano(e.textContent ?? "").includes(buscado)) continue;
      vistos.add(grupo);
      const paso = e.closest(".manual-paso")?.querySelector("h3")?.textContent;
      const ruta = seccion && e.tagName !== "H2" ? `${nombre} › ${seccion}` : nombre;
      let titulo: string, detalle = "";
      if (forma) { titulo = forma.querySelector("strong")?.textContent ?? ""; detalle = forma.querySelector("span")?.textContent ?? ""; }
      else if (e.tagName === "H2" || e.tagName === "H3") titulo = sinPaso(e.textContent ?? "");
      else if (paso) { titulo = sinPaso(paso); detalle = e.textContent ?? ""; }
      else if (e.tagName === "TD") { titulo = e.closest("tr")?.firstElementChild?.textContent ?? seccion; detalle = e === e.closest("tr")?.firstElementChild ? "" : (e.textContent ?? ""); }
      else { titulo = seccion || tituloDelCapitulo; detalle = e.textContent ?? ""; }
      encontrados.push({ elemento: forma ?? e, capitulo, ruta, titulo, texto: detalle });
    }
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

function Buscador({ alAbrirCapitulo }: { alAbrirCapitulo: (capitulo: number) => void }) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(0);
  const caja = useRef<HTMLInputElement>(null);
  const resultados = abierto ? buscarEnElManual(texto) : [];
  useEffect(() => {
    const alTeclear = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); caja.current?.focus(); caja.current?.select(); setAbierto(true); }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);
  function ir(r: Encontrado) {
    setAbierto(false);
    alAbrirCapitulo(r.capitulo);
    // Si el resultado es de otro capítulo, se lo lleva a la vista una vez que se muestra.
    const llevar = () => {
      r.elemento.scrollIntoView({ behavior: "smooth", block: "center" });
      if (!r.elemento.hasAttribute("tabindex")) r.elemento.setAttribute("tabindex", "-1");
      r.elemento.focus({ preventScroll: true });
      r.elemento.classList.add("manual-encontrado");
      setTimeout(() => r.elemento.classList.remove("manual-encontrado"), 2000);
    };
    if (r.elemento.closest("article")?.hidden) setTimeout(llevar, 0); else llevar();
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
