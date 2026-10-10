import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ErrorApi } from "../../api";
import { useCatalogo } from "../../catalogo";
import { fecha, pesos } from "../../formato";
import { Aviso, Boton, Buscador, Icono, Pagina, Pastilla, Plegable, Progreso, Vacio, numero } from "../ui";
import { useEsCelular } from "../vista";
import "../estilos/duplicados.css";

// Un mismo artículo en varios proveedores (RF-06): quien administra ve las sugerencias lado
// a lado y decide «es el mismo» o «son distintos». También une dos a mano y separa. Unir y
// separar se deshacen una con la otra, por eso ninguna pide confirmar.
type Resumen = { id: string; descripcion: string; marca: string | null; codigo_barras: string | null; proveedor: string | null; costo_neto: string | null; fecha_lista: string | null };
type Sugerencia = { id: string; motivo: string; creado_en: string; a: Resumen; b: Resumen };
type Union = { absorbido_id: string; absorbido: string; conservado_id: string; conservado: string; unido_en: string; proveedores: string | null };
type Lado = "a" | "b";
// Lo último que se hizo, con la forma de volver atrás cuando la hay.
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
  const [sugerencias, setSugerencias] = useState<Sugerencia[] | null>(null);
  const [uniones, setUniones] = useState<Union[]>([]);
  const [conservar, setConservar] = useState<Record<string, Lado>>({});
  const [hecho, setHecho] = useState<Hecho | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const lista = useRef<HTMLUListElement>(null);
  const enfocar = useRef<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [s, u] = await Promise.all([api<Sugerencia[]>("/equivalencias"), api<Union[]>("/equivalencias/unidos")]);
      setSugerencias(s);
      setUniones(u);
      setError(null);
    } catch (e) {
      setError(mensajeDe(e));
    }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { if (enLinea && error) void cargar(); }, [enLinea]); // eslint-disable-line react-hooks/exhaustive-deps

  // Con teclado se resuelve una tras otra: al salir una sugerencia, el foco pasa a la que ocupa su lugar.
  useEffect(() => {
    if (enfocar.current === null) return;
    const tarjetas = lista.current?.children;
    const destino = tarjetas?.[Math.min(enfocar.current, (tarjetas?.length ?? 1) - 1)];
    (destino?.querySelector("[data-testid=unir]") as HTMLElement | null)?.focus();
    enfocar.current = null;
  }, [sugerencias]);

  async function hacer(tarea: () => Promise<void>) {
    setOcupado(true); setError(null);
    try { await tarea(); } catch (e) { setError(mensajeDe(e)); } finally { setOcupado(false); }
  }

  async function buscar() {
    setBuscando(true); setError(null); setHecho(null);
    try {
      const r = await api<{ nuevas: number }>("/equivalencias/buscar", { method: "POST" });
      await cargar();
      setHecho({ tipo: "otro", texto: r.nuevas === 0 ? "No encontré duplicados nuevos en el catálogo." : r.nuevas === 1 ? "Encontré 1 posible duplicado nuevo." : `Encontré ${numero(r.nuevas)} posibles duplicados nuevos.` });
    } catch (e) { setError(mensajeDe(e)); } finally { setBuscando(false); }
  }

  const resolver = (s: Sugerencia, i: number, accion: "unir" | "rechazar") => hacer(async () => {
    const lado = conservar[s.id] ?? "a";
    await api(`/equivalencias/${s.id}/${accion}`, { method: "POST", body: JSON.stringify({ conservar: lado }) });
    const queda = s[lado];
    const sale = lado === "a" ? s.b : s.a;
    enfocar.current = i;
    setSugerencias((l) => (l ?? []).filter((x) => x.id !== s.id));
    setHecho(accion === "unir"
      ? { tipo: "union", texto: `Unidos: «${queda.descripcion}» ahora tiene ${[s.a.proveedor, s.b.proveedor].filter(Boolean).join(" y ") || "los dos proveedores"}. Si fue un error, deshacelo.`, deshacer: { absorbido_id: sale.id } }
      : { tipo: "otro", texto: `Marcados como distintos: «${s.a.descripcion}» y «${s.b.descripcion}» no se van a volver a sugerir.` });
    if (accion === "unir") setUniones(await api<Union[]>("/equivalencias/unidos"));
  });

  const unirAMano = (queda: { id: string; descripcion: string }, sale: { id: string; descripcion: string }) => hacer(async () => {
    await api("/equivalencias/unir", { method: "POST", body: JSON.stringify({ conservar_id: queda.id, absorber_id: sale.id }) });
    setHecho({ tipo: "union", texto: `Unidos: «${queda.descripcion}» absorbió a «${sale.descripcion}». Si fue un error, deshacelo.`, deshacer: { absorbido_id: sale.id } });
    await cargar();
  });

  const separar = (u: Union) => hacer(async () => {
    await api("/equivalencias/separar", { method: "POST", body: JSON.stringify({ absorbido_id: u.absorbido_id }) });
    setHecho({ tipo: "separacion", texto: `Separados: «${u.absorbido}» vuelve a ser un producto aparte, con sus precios, ventas y stock.`, deshacer: { conservar_id: u.conservado_id, absorber_id: u.absorbido_id } });
    await cargar();
  });

  const deshacer = (h: Hecho) => hacer(async () => {
    if (!h.deshacer) return;
    if ("absorbido_id" in h.deshacer) {
      await api("/equivalencias/separar", { method: "POST", body: JSON.stringify(h.deshacer) });
      setHecho({ tipo: "separacion", texto: "Unión deshecha: vuelven a ser dos productos, cada uno con sus precios, ventas y stock." });
    } else {
      await api("/equivalencias/unir", { method: "POST", body: JSON.stringify(h.deshacer) });
      setHecho({ tipo: "union", texto: "Separación deshecha: vuelven a ser un solo producto." });
    }
    await cargar();
  });

  const cuantas = sugerencias?.length ?? 0;
  const sinNada = sugerencias !== null && cuantas === 0;
  const quieto = ocupado || buscando || !enLinea;

  return (
    <Pagina titulo="Duplicados" testId="duplicados"
      bajada="El mismo artículo llega en la lista de varios proveedores. Al unirlos queda un solo producto con todos sus proveedores y el precio sale del más barato. Las ventas, el stock y los precios se conservan."
      acciones={<Boton variante={sinNada ? "principal" : undefined} className="duplicados-buscar" icono="buscar" disabled={quieto} onClick={() => void buscar()} data-testid="buscar-duplicados">Buscar duplicados en todo el catálogo</Boton>}>
      {!enLinea && <Aviso tipo="alerta">Sin conexión. Unir, separar y buscar duplicados necesitan internet.</Aviso>}
      <Aviso tipo="error" accion={sugerencias === null ? <Boton tam="chico" icono="repetir" onClick={() => void cargar()}>Reintentar</Boton> : undefined}>{error}</Aviso>
      {buscando && <div className="tarjeta relleno"><Progreso texto="Buscando duplicados en todo el catálogo: comparo códigos de barras y descripciones…" /></div>}

      {hecho && (
        <div className="duplicados-hecho" key={hecho.texto}>
          <Aviso tipo={hecho.tipo === "otro" ? "info" : "ok"} testId={hecho.tipo === "separacion" ? "mensaje-separar" : "mensaje"}
            accion={
              <span className="duplicados-hecho-botones">
                {hecho.deshacer && <Boton icono="deshacer" disabled={quieto} onClick={() => void deshacer(hecho)} data-testid="deshacer">Deshacer</Boton>}
                <Boton icono="cerrar" aria-label="Cerrar el aviso" onClick={() => setHecho(null)} />
              </span>
            }>{hecho.texto}</Aviso>
        </div>
      )}

      <section className="duplicados-seccion" aria-labelledby="duplicados-sugerencias">
        <div className="duplicados-seccion-cabeza">
          <h2 id="duplicados-sugerencias" className="seccion-titulo">Sugerencias</h2>
          {cuantas > 0 && <Pastilla tipo="alerta" sinPunto>{cuantas === 1 ? "Queda 1 por resolver" : `Quedan ${numero(cuantas)} por resolver`}</Pastilla>}
        </div>
        {sugerencias === null ? (
          error ? null : <div className="esqueleto duplicados-esqueleto" role="status" aria-label="Cargando las sugerencias" />
        ) : sinNada ? (
          <div className="tarjeta">
            <Vacio icono="duplicados" titulo="No hay duplicados por revisar">
              Cuando aplicás una lista, los productos nuevos se comparan solos con los de los otros proveedores. Si querés repasar todo el catálogo, tocá «Buscar duplicados en todo el catálogo».
            </Vacio>
          </div>
        ) : (
          <ul className="duplicados-sugerencias" ref={lista} data-testid="sugerencias-duplicados">
            {sugerencias.map((s, i) => {
              const elegido = conservar[s.id] ?? "a";
              const costos = [Number(s.a.costo_neto), Number(s.b.costo_neto)];
              const masBarato: Lado | null = s.a.costo_neto && s.b.costo_neto && costos[0] !== costos[1] ? (costos[0]! < costos[1]! ? "a" : "b") : null;
              return (
                <li key={s.id} className="tarjeta duplicados-sugerencia" data-testid="sugerencia">
                  <div className="duplicados-motivo">
                    <Pastilla tipo="azul" sinPunto>{s.motivo === "codigo_barras" ? "Mismo código de barras" : "Misma descripción"}</Pastilla>
                    <span className="detalle">Elegí qué nombre queda</span>
                  </div>
                  <div className="duplicados-par" role="radiogroup" aria-label="Qué nombre se conserva si son el mismo">
                    {(["a", "b"] as const).map((lado) => {
                      const p = s[lado];
                      return (
                        <button key={lado} type="button" role="radio" aria-checked={elegido === lado} className="duplicados-candidato" disabled={ocupado}
                          onClick={() => setConservar((c) => ({ ...c, [s.id]: lado }))} data-testid={`conservar-${lado}`}>
                          <span className="duplicados-candidato-marca" aria-hidden="true">{elegido === lado && <Icono nombre="tilde" tam={14} grosor={3.2} />}</span>
                          <span className="duplicados-candidato-datos">
                            <strong>{p.descripcion}</strong>
                            <span className="detalle">{p.marca ?? "Sin marca"} · {p.codigo_barras ? <code aria-label={`código de barras ${p.codigo_barras}`}>{p.codigo_barras}</code> : "sin código de barras"}</span>
                            <span className="duplicados-candidato-costo">
                              <span className="importe chico">{p.costo_neto ? pesos(p.costo_neto) : "Sin costo"}</span>
                              {masBarato === lado && <Pastilla tipo="ok" sinPunto>Más barato</Pastilla>}
                            </span>
                            <span className="detalle">{p.proveedor ?? "Sin proveedor"}{p.fecha_lista ? ` · lista del ${fecha(p.fecha_lista)}` : ""}</span>
                            <span className="duplicados-candidato-queda">{elegido === lado ? "Queda este nombre" : "Conservar este nombre"}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="duplicados-decidir">
                    <Boton variante={i === 0 ? "principal" : "marino"} disabled={quieto} onClick={() => void resolver(s, i, "unir")} data-testid="unir">Es el mismo</Boton>
                    <Boton disabled={quieto} onClick={() => void resolver(s, i, "rechazar")} data-testid="rechazar">Son distintos</Boton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <UnionManual esCelular={esCelular} quieto={quieto} alUnir={unirAMano} />

      <Plegable titulo="Unidos" extra={uniones.length === 0 ? "Ninguno todavía" : `${numero(uniones.length)} · se pueden separar`} relleno={false} testId="unidos">
        {uniones.length === 0 ? <p className="duplicados-nada">Todavía no se unió ningún producto. Los que unas quedan acá, para poder separarlos si fue un error.</p> : esCelular ? (
          <ul className="duplicados-uniones">
            {uniones.map((u) => (
              <li key={u.absorbido_id} className="renglon" data-testid="union">
                <span className="nombre">{u.conservado}</span>
                <Boton disabled={quieto} onClick={() => void separar(u)} aria-label={`Separar ${u.absorbido} de ${u.conservado}`} data-testid="separar">Separar</Boton>
                <span className="detalle">Absorbió a «{u.absorbido}» el {fecha(u.unido_en.slice(0, 10))}{u.proveedores ? ` · ${u.proveedores}` : ""}</span>
              </li>
            ))}
          </ul>
        ) : (
          <table className="tabla duplicados-tabla">
            <thead><tr><th scope="col">Producto que quedó</th><th scope="col">Absorbió a</th><th scope="col">Proveedores</th><th scope="col">Cuándo</th><th scope="col"><span className="solo-lectores">Separar</span></th></tr></thead>
            <tbody>
              {uniones.map((u) => (
                <tr key={u.absorbido_id} data-testid="union">
                  <td className="nombre">{u.conservado}</td>
                  <td>{u.absorbido}</td>
                  <td className="detalle">{u.proveedores ?? "—"}</td>
                  <td className="angosta">{fecha(u.unido_en.slice(0, 10))}</td>
                  <td className="angosta"><Boton tam="chico" icono="deshacer" disabled={quieto} onClick={() => void separar(u)} aria-label={`Separar ${u.absorbido} de ${u.conservado}`} data-testid="separar">Separar</Boton></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Plegable>
    </Pagina>
  );
}

type Elegido = { id: string; descripcion: string; proveedor: string | null };

function UnionManual({ esCelular, quieto, alUnir }: { esCelular: boolean; quieto: boolean; alUnir: (queda: Elegido, sale: Elegido) => Promise<void> }) {
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
    <Plegable titulo="Unir dos productos a mano" extra={esCelular ? undefined : "Para los que el sistema no sugirió"} testId="union-manual">
      <div className="duplicados-manual">
        <Elegir titulo="Producto que queda" ayuda="Conserva su nombre y suma los proveedores del otro." testId="conservar" elegido={queda} alElegir={setQueda} buscarProductos={buscarProductos} listo={catalogo !== null} />
        <Elegir titulo="Producto que se absorbe" ayuda="Queda dentro del otro y deja de aparecer en las búsquedas." testId="absorber" elegido={sale} alElegir={setSale} buscarProductos={buscarProductos} listo={catalogo !== null} />
      </div>
      {mismo && <Aviso tipo="error">Elegiste el mismo producto de los dos lados. Cambiá uno.</Aviso>}
      <div className="duplicados-manual-pie">
        <span className="detalle">No pide confirmar: si fue un error, lo separás desde «Unidos».</span>
        <Boton variante="marino" disabled={!queda || !sale || mismo || quieto} onClick={() => void unir()} data-testid="unir-manual">Unir estos dos</Boton>
      </div>
    </Plegable>
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
