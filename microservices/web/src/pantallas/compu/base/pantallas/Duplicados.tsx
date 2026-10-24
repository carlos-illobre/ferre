import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ErrorApi } from "../../../../datos/conexion";
import { buscarDuplicados, buscarUniones, resolverSugerencia, separar as separarProductos, unir as unirProductos, useDuplicados, type Lado, type Resumen, type Sugerencia, type Union } from "../../../../negocio/catalogo/duplicados";
import { useTeclasGlobales } from "../../../../plataforma/teclado/teclas";
import { AlLadoDeLasPestanas } from "../../../AlLadoDeLasPestanas";
import { TEXTOS } from "../../../textos";
import { useCatalogo } from "../../../../negocio/catalogo";
import { fecha, pesos } from "../../../../formato";
import { Aviso, Boton, Buscador, Hoja, Icono, Pagina, Progreso, Vacio, numero } from "../ui";
import { useEsCelular } from "../vista";
import "../estilos/duplicados.css";

// Un mismo artículo en varios proveedores (RF-06): quien administra ve las sugerencias lado
// a lado y decide «es el mismo» o «son distintos». También une dos a mano y separa. Unir y
// separar se deshacen una con la otra, por eso ninguna pide confirmar. Como la v2 (decisión 148,
// «La bandeja»): arriba los números, a la izquierda la cola y a la derecha el par en una tabla.
// Teclado: E es el mismo, D son distintos, J y K pasan a la siguiente y a la anterior, ← → eligen
// cuál se conserva, Alt B busca en todo el catálogo, Alt U une a mano y Alt S abre los unidos.
type Hecho = { tipo: "union" | "separacion" | "otro"; texto: string; deshacer?: { absorbido_id: string } | { conservar_id: string; absorber_id: string } };

const SIN_CONEXION = "Sin conexión con el servidor. Unir, separar y buscar duplicados necesitan internet.";
const mensajeDe = (e: unknown) => (e instanceof ErrorApi ? e.message : SIN_CONEXION);

function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  useEffect(() => {
    const si = () => setEnLinea(true);
    const no = () => setEnLinea(false);
    window.addEventListener("online", si);
    window.addEventListener("offline", no);
    return () => { window.removeEventListener("online", si); window.removeEventListener("offline", no); };
  }, []);
  return enLinea;
}

export function Duplicados() {
  const esCelular = useEsCelular();
  const enLinea = useEnLinea();
  const { sugerencias, uniones: unidos, error: fallo, recargar } = useDuplicados();
  const uniones = unidos ?? [];
  const [conservar, setConservar] = useState<Record<string, Lado>>({});
  const [hecho, setHecho] = useState<Hecho | null>(null);
  const [errorAlHacer, setError] = useState<string | null>(null);
  const error = errorAlHacer ?? (fallo ? mensajeDe(fallo) : null);
  const [buscando, setBuscando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [motivo, setMotivo] = useState<"todas" | "codigo_barras" | "descripcion">("todas");
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"unir" | "unidos" | null>(null);
  const t = TEXTOS.duplicados;

  useEffect(() => { if (enLinea && error) recargar(); }, [enLinea]); // eslint-disable-line react-hooks/exhaustive-deps

  async function hacer(tarea: () => Promise<void>) {
    setOcupado(true); setError(null);
    try { await tarea(); } catch (e) { setError(mensajeDe(e)); } finally { setOcupado(false); }
  }

  async function buscar() {
    if (buscando) return;
    setBuscando(true); setError(null); setHecho(null);
    try {
      const nuevas = await buscarDuplicados();
      setHecho({ tipo: "otro", texto: nuevas === 0 ? "No encontré duplicados nuevos en el catálogo." : nuevas === 1 ? "Encontré 1 posible duplicado nuevo." : `Encontré ${numero(nuevas)} posibles duplicados nuevos.` });
    } catch (e) { setError(mensajeDe(e)); } finally { setBuscando(false); }
  }

  const todas = sugerencias ?? [];
  const cola = motivo === "todas" ? todas : todas.filter((s) => s.motivo === motivo);
  const posicion = Math.max(0, cola.findIndex((s) => s.id === elegidaId));
  const actual = cola[posicion] ?? null;
  const porCodigo = todas.filter((s) => s.motivo === "codigo_barras").length;
  const quieto = ocupado || buscando || !enLinea;

  // Al resolver una, queda elegida la que ocupa su lugar.
  const resolver = (s: Sugerencia, accion: "unir" | "rechazar") => hacer(async () => {
    const siguiente = cola[posicion + 1] ?? cola[posicion - 1] ?? null;
    const { queda, sale } = await resolverSugerencia(s, accion, conservar[s.id] ?? "a");
    setElegidaId(siguiente?.id ?? null);
    setHecho(accion === "unir"
      ? { tipo: "union", texto: `Unidos: «${queda.descripcion}» ahora tiene ${[s.a.proveedor, s.b.proveedor].filter(Boolean).join(" y ") || "los dos proveedores"}. Si fue un error, deshacelo.`, deshacer: { absorbido_id: sale.id } }
      : { tipo: "otro", texto: `Marcados como distintos: «${s.a.descripcion}» y «${s.b.descripcion}» no se van a volver a sugerir.` });
  });

  const unirAMano = (queda: { id: string; descripcion: string }, sale: { id: string; descripcion: string }) => hacer(async () => {
    await unirProductos(queda.id, sale.id);
    setPanel(null);
    setHecho({ tipo: "union", texto: `Unidos: «${queda.descripcion}» absorbió a «${sale.descripcion}». Si fue un error, deshacelo.`, deshacer: { absorbido_id: sale.id } });
  });

  const separar = (u: Union) => hacer(async () => {
    await separarProductos(u.absorbido_id);
    setHecho({ tipo: "separacion", texto: `Separados: «${u.absorbido}» vuelve a ser un producto aparte, con sus precios, ventas y stock.`, deshacer: { conservar_id: u.conservado_id, absorber_id: u.absorbido_id } });
  });

  const deshacer = (h: Hecho) => hacer(async () => {
    if (!h.deshacer) return;
    if ("absorbido_id" in h.deshacer) {
      await separarProductos(h.deshacer.absorbido_id);
      setHecho({ tipo: "separacion", texto: "Unión deshecha: vuelven a ser dos productos, cada uno con sus precios, ventas y stock." });
    } else {
      await unirProductos(h.deshacer.conservar_id, h.deshacer.absorber_id);
      setHecho({ tipo: "union", texto: "Separación deshecha: vuelven a ser un solo producto." });
    }
  });

  const mover = useCallback((paso: number) => {
    if (!cola.length) return;
    setElegidaId(cola[(posicion + paso + cola.length) % cola.length]!.id);
  }, [cola, posicion]);

  // Las teclas usan siempre lo último (qué se conserva, cuál está elegida).
  const alTeclear = useRef<(e: globalThis.KeyboardEvent) => void>(() => undefined);
  alTeclear.current = (e) => {
    if (document.querySelector("dialog[open]") || e.ctrlKey || e.metaKey) return;
    if (e.altKey) {
      if (e.code === "KeyB") { e.preventDefault(); if (!quieto) void buscar(); }
      else if (e.code === "KeyU") { e.preventDefault(); setPanel("unir"); }
      else if (e.code === "KeyS") { e.preventDefault(); setPanel("unidos"); }
      return;
    }
    if (!actual) return;
    if (e.code === "KeyE") { e.preventDefault(); if (!quieto) void resolver(actual, "unir"); }
    else if (e.code === "KeyD") { e.preventDefault(); if (!quieto) void resolver(actual, "rechazar"); }
    else if (e.code === "KeyJ") { e.preventDefault(); mover(1); }
    else if (e.code === "KeyK") { e.preventDefault(); mover(-1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); setConservar((c) => ({ ...c, [actual.id]: e.key === "ArrowLeft" ? "a" : "b" })); }
  };
  const teclas = useCallback((e: globalThis.KeyboardEvent) => alTeclear.current(e), []);
  useTeclasGlobales(teclas);

  // Cuántas sugerencias llegaron cada uno de los últimos siete días: las barritas de «Por revisar».
  const barras = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(); dia.setHours(0, 0, 0, 0); dia.setDate(dia.getDate() - (6 - i));
    return todas.filter((s) => new Date(s.creado_en).setHours(0, 0, 0, 0) === dia.getTime()).length;
  }), [todas]);
  const tope = Math.max(1, ...barras);

  return (
    <Pagina titulo="Duplicados" testId="duplicados" className={esCelular ? "" : "duplicados-v2"}
      acciones={<AlLadoDeLasPestanas>
        <div className="fila dv-arriba">
          <Boton icono="buscar" disabled={quieto} onClick={() => void buscar()} data-atajo="b" data-testid="buscar-duplicados">{t.buscarEnTodo.largo}<kbd className="tecla solo-compu" aria-hidden="true">Alt B</kbd></Boton>
          <Boton icono="unir" onClick={() => setPanel("unir")} data-atajo="u" data-testid="unir-a-mano">{t.unirAMano.largo}<kbd className="tecla solo-compu" aria-hidden="true">Alt U</kbd></Boton>
          <Boton icono="separar" onClick={() => setPanel("unidos")} data-atajo="s" data-testid="unidos">{t.unidosYSeparar.largo}<kbd className="tecla solo-compu" aria-hidden="true">Alt S</kbd></Boton>
        </div>
      </AlLadoDeLasPestanas>}>
      {!enLinea && <Aviso tipo="alerta">Sin conexión. Unir, separar y buscar duplicados necesitan internet.</Aviso>}
      <Aviso tipo="error" accion={sugerencias === null ? <Boton tam="chico" icono="repetir" onClick={recargar}>Reintentar</Boton> : undefined}>{error}</Aviso>
      {buscando && <div className="tarjeta relleno"><Progreso texto="Buscando duplicados en todo el catálogo: comparo códigos de barras y descripciones…" /></div>}

      <div className="dv-numeros">
        <div className="dv-numero ambar">
          <span className="dv-numero-ic"><Icono nombre="capas" /></span>
          <span className="dv-numero-texto"><span>{t.porRevisar.largo}</span><b>{numero(todas.length)} <small>{todas.length === 1 ? "sugerencia" : "sugerencias"}</small></b></span>
          <span className="dv-barras" aria-label="Cuántas llegaron cada uno de los últimos siete días">{barras.map((n, i) => <i key={i} className={n ? "" : "vacia"} style={{ height: `${n ? Math.max(25, (n / tope) * 100) : 18}%` }} />)}</span>
        </div>
        <div className="dv-numero"><span className="dv-numero-ic"><Icono nombre="codigo-de-barras" /></span><span className="dv-numero-texto"><span>Mismo código</span><b>{numero(porCodigo)}</b></span></div>
        <div className="dv-numero"><span className="dv-numero-ic"><Icono nombre="texto" /></span><span className="dv-numero-texto"><span>{t.descripcionParecida.largo}</span><b>{numero(todas.length - porCodigo)}</b></span></div>
        <div className="dv-numero verde"><span className="dv-numero-ic"><Icono nombre="unir" /></span><span className="dv-numero-texto"><span>Unidos hasta hoy</span><b>{numero(uniones.length)} <small>{uniones.length === 1 ? "producto" : "productos"}</small></b></span></div>
      </div>

      <div className="dv">
        <div className="dv-bandeja">
          <div className="dv-chips" role="tablist" aria-label="Qué sugerencias ver">
            {([["todas", "Todas", todas.length], ["codigo_barras", "Código", porCodigo], ["descripcion", "Texto", todas.length - porCodigo]] as const).map(([valor, nombre, n]) => (
              <button key={valor} type="button" role="tab" aria-selected={motivo === valor} className="dv-chip" onClick={() => { setMotivo(valor); setElegidaId(null); }}>{nombre} ({n})</button>
            ))}
          </div>
          {sugerencias === null ? (error ? null : <div className="esqueleto duplicados-esqueleto" role="status" aria-label="Cargando las sugerencias" />) : (
            <ul className="dv-cola" data-testid="sugerencias-duplicados">
              {cola.map((s, i) => (
                <li key={s.id}>
                  <button type="button" className={`dv-sug ${i === posicion ? "foco" : ""}`} aria-current={i === posicion} onClick={() => setElegidaId(s.id)} data-testid="sugerencia">
                    <span className="dv-foto" aria-hidden="true"><Icono nombre="productos" tam={18} /></span>
                    <span className="dv-n">{s[conservar[s.id] ?? "a"].descripcion}</span>
                    <span className="dv-d"><Icono nombre={s.motivo === "codigo_barras" ? "codigo-de-barras" : "texto"} tam={16} />{[s.a.proveedor, s.b.proveedor].map((p) => p ?? "Sin proveedor").join(" · ")}</span>
                    <span className="dv-cuando">{cuandoLlego(s.creado_en)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {actual ? (
          <Comparar s={actual} posicion={posicion} total={cola.length} conservar={conservar[actual.id] ?? "a"} quieto={quieto}
            alConservar={(lado) => setConservar((c) => ({ ...c, [actual.id]: lado }))}
            alResolver={(accion) => void resolver(actual, accion)} alMover={mover} />
        ) : (
          <section className="dv-comparar dv-vacia">
            {sugerencias !== null && (
              <Vacio icono="duplicados" titulo="No hay duplicados por revisar"
                accion={<Boton variante="principal" icono="buscar" disabled={quieto} onClick={() => void buscar()}>{t.buscarEnTodo.largo}</Boton>}>
                Cuando aplicás una lista, los productos nuevos se comparan solos con los de los otros proveedores. Si querés repasar todo el catálogo, buscá en todo el catálogo.
              </Vacio>
            )}
          </section>
        )}
      </div>

      {hecho && (
        <div className="dv-hecho" key={hecho.texto}>
          <Aviso tipo={hecho.tipo === "otro" ? "info" : "ok"} testId={hecho.tipo === "separacion" ? "mensaje-separar" : "mensaje"}
            accion={
              <span className="duplicados-hecho-botones">
                {hecho.deshacer && <Boton icono="deshacer" disabled={quieto} onClick={() => void deshacer(hecho)} data-testid="deshacer">Deshacer</Boton>}
                <Boton icono="cerrar" aria-label="Cerrar el aviso" onClick={() => setHecho(null)} />
              </span>
            }>{hecho.texto}</Aviso>
        </div>
      )}

      {panel === "unir" && (
        <Hoja titulo="Unir dos productos a mano" alCerrar={() => setPanel(null)} ancha testId="union-manual">
          <UnionManual quieto={quieto} alUnir={unirAMano} />
        </Hoja>
      )}
      {panel === "unidos" && <Unidos uniones={uniones} quieto={quieto} alSeparar={separar} alCerrar={() => setPanel(null)} />}
    </Pagina>
  );
}

// «hoy», «ayer» o «14/10»: cuándo llegó la sugerencia.
function cuandoLlego(iso: string): string {
  const d = new Date(iso);
  const dias = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000);
  return dias === 0 ? "hoy" : dias === 1 ? "ayer" : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const diasDesde = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(`${iso.slice(0, 10)}T00:00:00`).getTime()) / 86400000));
const plano = (t: string | null) => (t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// El par, en una tabla lado a lado: la columna que se conserva en verde suave, lo que difiere del
// otro en ámbar y lo que coincide con un tilde.
function Comparar({ s, posicion, total, conservar, quieto, alConservar, alResolver, alMover }: {
  s: Sugerencia; posicion: number; total: number; conservar: Lado; quieto: boolean;
  alConservar: (lado: Lado) => void; alResolver: (accion: "unir" | "rechazar") => void; alMover: (paso: number) => void;
}) {
  const t = TEXTOS.duplicados;
  const costos = [Number(s.a.costo_neto), Number(s.b.costo_neto)] as const;
  const masBarato: Lado | null = s.a.costo_neto && s.b.costo_neto && costos[0] !== costos[1] ? (costos[0] < costos[1] ? "a" : "b") : null;
  const otro = (lado: Lado): Lado => (lado === "a" ? "b" : "a");
  const elQueSale = otro(conservar);
  // Lo que difiere se marca del lado que no se conserva; lo que coincide, con un tilde.
  const celda = (lado: Lado, valor: string | null, igualA: (p: Resumen) => string | null) => {
    if (lado !== elQueSale) return <>{valor ?? "—"}</>;
    const coincide = plano(igualA(s[lado])) === plano(igualA(s[otro(lado)])) && valor !== null;
    return coincide ? <>{valor}<span className="dv-ok" aria-label="coincide"><Icono nombre="tilde" tam={16} grosor={2.4} /></span></> : <span className="dv-difiere">{valor ?? "—"}</span>;
  };
  const queda = masBarato ? s[masBarato] : s[conservar];
  const fila = (rotulo: string, contenido: (lado: Lado) => React.ReactNode) => (
    <>
      <div className="dv-r">{rotulo}</div>
      {(["a", "b"] as const).map((lado) => <div key={lado} className={`dv-cel ${lado === conservar ? "elegida" : ""}`}>{contenido(lado)}</div>)}
    </>
  );
  return (
    <section className="dv-comparar" aria-labelledby="dv-titulo">
      <header className="dv-comp-cab">
        <h2 id="dv-titulo">{t.esElMismoArticulo.largo}</h2>
        <span className={`dv-motivo ${s.motivo === "codigo_barras" ? "codigo" : ""}`}><Icono nombre={s.motivo === "codigo_barras" ? "codigo-de-barras" : "texto"} tam={16} />{s.motivo === "codigo_barras" ? t.mismoCodigo.largo : t.descripcionParecida.largo}</span>
        <span className="dv-nav">
          <button type="button" className="dv-tecla-boton" onClick={() => alMover(1)} aria-label="La siguiente (J)" aria-keyshortcuts="J"><kbd className="tecla">J</kbd></button>
          <button type="button" className="dv-tecla-boton" onClick={() => alMover(-1)} aria-label="La anterior (K)" aria-keyshortcuts="K"><kbd className="tecla">K</kbd></button>
          {posicion + 1} de {total}
        </span>
      </header>
      <div className="dv-tabla" role="radiogroup" aria-label="Qué producto se conserva si son el mismo">
        <div className="dv-r dv-h">Producto</div>
        {(["a", "b"] as const).map((lado) => (
          <div key={lado} className={`dv-cel dv-h ${lado === conservar ? "elegida" : ""}`}>
            <button type="button" role="radio" aria-checked={lado === conservar} className={`dv-cons ${lado === conservar ? "si" : ""}`} disabled={quieto} onClick={() => alConservar(lado)} data-testid={`conservar-${lado}`}>
              <span className="dv-radio" aria-hidden="true" />{t.conservarEste.largo}<kbd className="tecla" aria-hidden="true">{lado === "a" ? "←" : "→"}</kbd>
            </button>
            <span className="dv-prod">
              <span className="dv-foto grande" aria-hidden="true"><Icono nombre="productos" tam={22} /></span>
              <span className="dv-prod-n">{celda(lado, s[lado].descripcion, (p) => p.descripcion)}</span>
            </span>
          </div>
        ))}
        {fila("Marca", (lado) => celda(lado, s[lado].marca, (p) => p.marca))}
        {fila("Cód. barras", (lado) => celda(lado, s[lado].codigo_barras, (p) => p.codigo_barras))}
        {fila("Proveedor", (lado) => s[lado].proveedor ?? "Sin proveedor")}
        {fila("Costo", (lado) => (
          <>
            <span className="dv-costo">{s[lado].costo_neto ? pesos(s[lado].costo_neto) : "Sin costo"}</span>
            {masBarato === lado && <span className="dv-barato"><Icono nombre="tilde" tam={14} grosor={3} />{t.elMasBarato.largo}</span>}
            {masBarato && masBarato !== lado && <span className="dv-mas">+{numero(Math.round(((costos[lado === "a" ? 0 : 1] - costos[lado === "a" ? 1 : 0]) / costos[lado === "a" ? 1 : 0]) * 100))} %</span>}
          </>
        ))}
        {fila("Lista", (lado) => {
          const f = s[lado].fecha_lista;
          return celda(lado, f ? `${fecha(f)} · hace ${diasDesde(f)} ${diasDesde(f) === 1 ? "día" : "días"}` : null, (p) => p.fecha_lista);
        })}
      </div>
      <p className="dv-queda"><Icono nombre="unir" tam={18} />
        <span>Queda <b>un solo producto</b> con {[s.a.proveedor, s.b.proveedor].filter(Boolean).length === 2 ? "2 proveedores" : "sus proveedores"}, con el nombre «{s[conservar].descripcion}». El costo sale de <b>{queda.proveedor ?? "el más barato"}{queda.costo_neto ? ` (${pesos(queda.costo_neto)})` : ""}</b>. Si te equivocás, lo separás en Unidos.</span>
      </p>
      <footer className="dv-pie">
        <button type="button" className="dv-mismo" disabled={quieto} onClick={() => alResolver("unir")} aria-keyshortcuts="E" data-testid="unir"><Icono nombre="unir" />{t.esElMismo.largo}<kbd className="tecla" aria-hidden="true">E</kbd></button>
        <button type="button" className="dv-distintos" disabled={quieto} onClick={() => alResolver("rechazar")} aria-keyshortcuts="D" data-testid="rechazar"><Icono nombre="cerrar" />{t.sonDistintos.largo}<kbd className="tecla" aria-hidden="true">D</kbd></button>
        <button type="button" className="dv-saltar" onClick={() => alMover(1)} aria-keyshortcuts="J">{t.saltar.largo}<kbd className="tecla" aria-hidden="true">J</kbd></button>
        <span className="dv-ayuda"><span className="dv-difiere">ámbar</span>{t.loQueCambia.largo}</span>
      </footer>
    </section>
  );
}

// Los productos unidos, para separarlos si fue un error, con un buscador.
function Unidos({ uniones, quieto, alSeparar, alCerrar }: { uniones: Union[]; quieto: boolean; alSeparar: (u: Union) => Promise<void>; alCerrar: () => void }) {
  const [buscado, setBuscado] = useState("");
  const vistas = buscarUniones(uniones, buscado);
  return (
    <Hoja titulo={`${TEXTOS.duplicados.productosUnidos.largo} (${numero(uniones.length)})`} alCerrar={alCerrar} ancha testId="unidos">
      {uniones.length === 0 ? <p className="duplicados-nada">Todavía no se unió ningún producto. Los que unas quedan acá, para poder separarlos si fue un error.</p> : (
        <>
          <Buscador valor={buscado} alCambiar={setBuscado} placeholder="Buscar un producto unido" etiqueta="Buscar un producto unido" testId="buscar-union" autoFoco />
          {vistas.length === 0 ? <p className="duplicados-nada">Ningún producto unido coincide con la búsqueda.</p> : (
            <table className="tabla duplicados-tabla">
              <thead><tr><th scope="col">Producto que quedó</th><th scope="col">Absorbió a</th><th scope="col">Proveedores</th><th scope="col">Cuándo</th><th scope="col"><span className="solo-lectores">Separar</span></th></tr></thead>
              <tbody>
                {vistas.map((u) => (
                  <tr key={u.absorbido_id} data-testid="union">
                    <td className="nombre">{u.conservado}</td>
                    <td>{u.absorbido}</td>
                    <td className="detalle">{u.proveedores ?? "—"}</td>
                    <td className="angosta">{fecha(u.unido_en.slice(0, 10))}</td>
                    <td className="angosta"><Boton tam="chico" icono="separar" disabled={quieto} onClick={() => void alSeparar(u)} aria-label={`Separar ${u.absorbido} de ${u.conservado}`} data-testid="separar">{TEXTOS.duplicados.separar.largo}</Boton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </Hoja>
  );
}

type Elegido = { id: string; descripcion: string; proveedor: string | null };

function UnionManual({ quieto, alUnir }: { quieto: boolean; alUnir: (queda: Elegido, sale: Elegido) => Promise<void> }) {
  const { catalogo, buscarProductos } = useCatalogo();
  const [queda, setQueda] = useState<Elegido | null>(null);
  const [sale, setSale] = useState<Elegido | null>(null);
  const mismo = queda !== null && sale !== null && queda.id === sale.id;

  async function unir() {
    if (!queda || !sale || mismo) return;
    await alUnir(queda, sale);
    setQueda(null); setSale(null);
  }

  return (
    <>
      <div className="duplicados-manual">
        <Elegir titulo="Producto que queda" ayuda="Conserva su nombre y suma los proveedores del otro." testId="conservar" elegido={queda} alElegir={setQueda} buscarProductos={buscarProductos} listo={catalogo !== null} />
        <Elegir titulo="Producto que se absorbe" ayuda="Queda dentro del otro y deja de aparecer en las búsquedas." testId="absorber" elegido={sale} alElegir={setSale} buscarProductos={buscarProductos} listo={catalogo !== null} />
      </div>
      {mismo && <Aviso tipo="error">Elegiste el mismo producto de los dos lados. Cambiá uno.</Aviso>}
      <div className="duplicados-manual-pie">
        <span className="detalle">No pide confirmar: si fue un error, lo separás desde «Unidos».</span>
        <Boton variante="marino" disabled={!queda || !sale || mismo || quieto} onClick={() => void unir()} data-testid="unir-manual">Unir estos dos</Boton>
      </div>
    </>
  );
}

function Elegir({ titulo, ayuda, testId, elegido, alElegir, buscarProductos, listo }: {
  titulo: string; ayuda: string; testId: string; elegido: Elegido | null; alElegir: (p: Elegido | null) => void; listo: boolean;
  buscarProductos: (consulta: string, maximo?: number) => { id: string; descripcion: string; proveedor: string | null; marca: string | null }[];
}) {
  const [q, setQ] = useState("");
  const resultados = useMemo(() => (q.trim() ? buscarProductos(q, 6) : []), [buscarProductos, q]);
  return (
    <div className="duplicados-elegir">
      <h3>{titulo}</h3>
      <p className="detalle">{ayuda}</p>
      {elegido ? (
        <div className="duplicados-elegido" data-testid={`elegido-${testId}`}>
          <span className="duplicados-elegido-datos"><strong>{elegido.descripcion}</strong>{elegido.proveedor && <span className="detalle">{elegido.proveedor}</span>}</span>
          <Boton tam="chico" onClick={() => alElegir(null)} aria-label={`Cambiar el ${titulo.toLowerCase()}`}>Cambiar</Boton>
        </div>
      ) : (
        <>
          <Buscador valor={q} alCambiar={setQ} placeholder="Buscar producto" etiqueta={`Buscar el ${titulo.toLowerCase()}`} testId={`buscar-${testId}`} />
          {q.trim() !== "" && (
            resultados.length > 0 ? (
              <ul className="lista">
                {resultados.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="renglon" onClick={() => { alElegir({ id: p.id, descripcion: p.descripcion, proveedor: p.proveedor }); setQ(""); }}>
                      <span className="nombre">{p.descripcion}</span>
                      <span className="detalle">{[p.marca, p.proveedor].filter(Boolean).join(" · ") || "Sin proveedor"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="detalle" role="status">{listo ? `No hay productos que coincidan con «${q.trim()}». Probá con menos palabras.` : "Cargando el catálogo…"}</p>
          )}
        </>
      )}
    </div>
  );
}
