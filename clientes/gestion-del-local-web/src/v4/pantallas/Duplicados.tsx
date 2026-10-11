import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useCatalogo } from "../../catalogo";
import { useConexion } from "../conexion";
import { pesosConCentavos } from "../formato";
import {
  avisar, Aviso, Boton, Buscador, Cargando, clases, DURACION_DEL_AVISO, ErrorDeCarga, Hoja, Icono, Iniciales, Lista, Pagina, Pastilla, Renglon, Tarjeta, TituloDeSeccion, Vacio,
} from "../piezas";
import { mensajeDe, plural, type Producto } from "./deposito-comun";
import "../estilos/duplicados.css";

// El mismo artículo llega en la lista de varios proveedores. Acá se ven las sugerencias lado a
// lado y se decide «es el mismo» o «son distintos»; también se unen dos a mano y se separan.
// Unir y separar se deshacen una con la otra, por eso ninguna pide confirmar.
type Resumen = { id: string; descripcion: string; marca: string | null; codigo_barras: string | null; proveedor: string | null; costo_neto: string | null; fecha_lista: string | null };
type Sugerencia = { id: string; motivo: string; creado_en: string; a: Resumen; b: Resumen };
type Union = { absorbido_id: string; absorbido: string; conservado_id: string; conservado: string; unido_en: string; proveedores: string | null };
type Lado = "a" | "b";

const SIN_CONEXION = "Unir, separar y buscar duplicados necesitan internet.";
const MAXIMO_DE_RESULTADOS = 4;

// «Son distintos» se puede deshacer mientras dura el aviso: recién después se manda (el
// servidor no tiene cómo volver atrás). Vive fuera de la pantalla para que salga igual si se
// cambia de pantalla o se cierra la pestaña antes.
let rechazoPorMandar: { mandar: () => void; reloj: number } | null = null;
function mandarRechazoPendiente() {
  if (!rechazoPorMandar) return;
  window.clearTimeout(rechazoPorMandar.reloj);
  const { mandar } = rechazoPorMandar;
  rechazoPorMandar = null;
  mandar();
}
if (typeof window !== "undefined") window.addEventListener("pagehide", mandarRechazoPendiente);

/** Para las pruebas: manda lo que estuviera esperando. */
export function reiniciarDuplicados() {
  mandarRechazoPendiente();
}

// ---------------------------------------------------------------- Pantalla

export function Duplicados() {
  const { enLinea } = useConexion();
  const [sugerencias, setSugerencias] = useState<Sugerencia[] | null>(null);
  const [unidos, setUnidos] = useState<Union[]>([]);
  const [errorDeCarga, setErrorDeCarga] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [aMano, setAMano] = useState(false);

  const cargar = useCallback(async () => {
    // Un «son distintos» que todavía no salió volvería a aparecer en la lista.
    mandarRechazoPendiente();
    try {
      const [s, u] = await Promise.all([api<Sugerencia[]>("/equivalencias"), api<Union[]>("/equivalencias/unidos")]);
      setSugerencias(s); setUnidos(u); setErrorDeCarga(null);
    } catch (e) {
      setErrorDeCarga(mensajeDe(e, "Revisá la conexión y probá de nuevo."));
    }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { if (enLinea && errorDeCarga) void cargar(); }, [enLinea]); // eslint-disable-line react-hooks/exhaustive-deps

  async function hacer(tarea: () => Promise<void>) {
    if (ocupado) return;
    setOcupado(true); setError(null);
    try { await tarea(); } catch (e) { setError(mensajeDe(e, SIN_CONEXION)); } finally { setOcupado(false); }
  }

  const deshacerUnion = (absorbidoId: string) => hacer(async () => {
    await api("/equivalencias/separar", { method: "POST", body: JSON.stringify({ absorbido_id: absorbidoId }) });
    await cargar();
    avisar("Unión deshecha", { detalle: "Vuelven a ser dos productos, cada uno con sus precios, ventas y stock." });
  });

  const unir = (s: Sugerencia, lado: Lado) => hacer(async () => {
    await api(`/equivalencias/${s.id}/unir`, { method: "POST", body: JSON.stringify({ conservar: lado }) });
    const queda = s[lado];
    const sale = lado === "a" ? s.b : s.a;
    setSugerencias((l) => (l ?? []).filter((x) => x.id !== s.id));
    setUnidos(await api<Union[]>("/equivalencias/unidos"));
    avisar("Unidos en un solo producto", { detalle: `Quedó «${queda.descripcion}».`, accion: { texto: "Deshacer", alTocar: () => void deshacerUnion(sale.id) } });
  });

  function sonDistintos(s: Sugerencia) {
    if (ocupado) return;
    mandarRechazoPendiente();
    const lugar = (sugerencias ?? []).findIndex((x) => x.id === s.id);
    rechazoPorMandar = {
      mandar: () => { api(`/equivalencias/${s.id}/rechazar`, { method: "POST", body: JSON.stringify({}), keepalive: true }).catch(() => undefined); },
      reloj: window.setTimeout(mandarRechazoPendiente, DURACION_DEL_AVISO),
    };
    const esteRechazo = rechazoPorMandar;
    setSugerencias((l) => (l ?? []).filter((x) => x.id !== s.id));
    avisar("Anotado: son distintos", {
      detalle: "No se vuelve a sugerir.",
      accion: {
        texto: "Deshacer",
        alTocar: () => {
          if (rechazoPorMandar !== esteRechazo) return; // ya salió
          window.clearTimeout(esteRechazo.reloj);
          rechazoPorMandar = null;
          setSugerencias((l) => { const lista = l ?? []; return [...lista.slice(0, lugar), s, ...lista.slice(lugar)]; });
        },
      },
    });
  }

  const separar = (u: Union) => hacer(async () => {
    await api("/equivalencias/separar", { method: "POST", body: JSON.stringify({ absorbido_id: u.absorbido_id }) });
    await cargar();
    avisar("Separados: vuelven a ser dos productos", {
      accion: {
        texto: "Volver a unir",
        alTocar: () => void hacer(async () => {
          await api("/equivalencias/unir", { method: "POST", body: JSON.stringify({ conservar_id: u.conservado_id, absorber_id: u.absorbido_id }) });
          await cargar();
        }),
      },
    });
  });

  const unirAMano = (queda: Producto, sale: Producto) => hacer(async () => {
    await api("/equivalencias/unir", { method: "POST", body: JSON.stringify({ conservar_id: queda.id, absorber_id: sale.id }) });
    setAMano(false);
    await cargar();
    avisar("Unidos en un solo producto", { detalle: `Quedó «${queda.descripcion}».`, accion: { texto: "Deshacer", alTocar: () => void deshacerUnion(sale.id) } });
  });

  async function buscarEnTodoElCatalogo() {
    if (buscando) return;
    setBuscando(true); setError(null);
    try {
      const r = await api<{ nuevas: number }>("/equivalencias/buscar", { method: "POST" });
      await cargar();
      avisar(r.nuevas === 0 ? "No hay duplicados nuevos en el catálogo" : r.nuevas === 1 ? "Apareció 1 posible duplicado" : `Aparecieron ${r.nuevas} posibles duplicados`);
    } catch (e) {
      setError(mensajeDe(e, SIN_CONEXION));
    } finally {
      setBuscando(false);
    }
  }

  if (sugerencias === null) {
    return (
      <Pagina titulo="Duplicados" testId="duplicados">
        {errorDeCarga
          ? <ErrorDeCarga titulo="No se pudieron cargar los duplicados" alReintentar={() => { setErrorDeCarga(null); void cargar(); }}>{errorDeCarga}</ErrorDeCarga>
          : <Cargando texto="Buscando productos repetidos…" />}
      </Pagina>
    );
  }

  const quieto = ocupado || buscando || !enLinea;
  const buscarTodo = <Boton variante="texto" tam="chico" icono="buscar" disabled={quieto} onClick={() => void buscarEnTodoElCatalogo()} data-testid="buscar-duplicados">{buscando ? "Buscando en todo el catálogo…" : "Buscar duplicados en todo el catálogo"}</Boton>;

  return (
    <Pagina titulo="Duplicados" testId="duplicados">
      <div className="duplicados__entrada">
        <p>A veces el mismo producto figura dos veces, con nombres distintos en la lista de cada proveedor. Si los unís queda uno solo, con los dos costos.</p>
        <Boton tam="chico" icono="unir" disabled={!enLinea} onClick={() => setAMano(true)} data-testid="abrir-union-manual">Unir dos a mano</Boton>
      </div>

      {!enLinea && <Aviso tipo="alerta" titulo="Sin conexión" testId="sin-conexion">{SIN_CONEXION}</Aviso>}
      {error && !aMano && <Aviso tipo="error" titulo="No se pudo hacer" testId="error-duplicados">{error}</Aviso>}

      {sugerencias.length === 0 ? (
        <Vacio icono="tilde" titulo="No hay duplicados para revisar" testId="sin-duplicados">Cuando subas una lista de precios y aparezca un producto que parece repetido, lo vas a ver acá.</Vacio>
      ) : (
        <>
          <TituloDeSeccion titulo="¿Son el mismo producto?">{sugerencias.length === 1 ? "1 para revisar" : `${sugerencias.length} para revisar`}</TituloDeSeccion>
          <div className="duplicados__cola" data-testid="sugerencias-duplicados">
            {sugerencias.map((s, i) => <Comparar key={s.id} sugerencia={s} primera={i === 0} quieto={quieto} alUnir={(lado) => void unir(s, lado)} alDistintos={() => sonDistintos(s)} />)}
          </div>
        </>
      )}

      {unidos.length > 0 && (
        <>
          <TituloDeSeccion titulo="Ya unidos">{plural(unidos.length, "producto", "productos")}</TituloDeSeccion>
          <Lista data-testid="unidos">
            {unidos.map((u) => (
              <Renglon
                key={u.absorbido_id}
                titulo={u.conservado}
                detalle={<>También figura como «{u.absorbido}»{u.proveedores && ` · ${u.proveedores.replace(/, ([^,]*)$/, " y $1")}`}</>}
                fin={<Boton tam="chico" icono="separar" disabled={quieto} aria-label={`Separar ${u.absorbido} de ${u.conservado}`} onClick={() => void separar(u)} data-testid="separar">Separar</Boton>}
                testId="union"
              />
            ))}
          </Lista>
        </>
      )}

      <div className="duplicados__buscar-todo">{buscarTodo}</div>

      {aMano && <UnirAMano error={error} ocupado={ocupado} alCerrar={() => { setAMano(false); setError(null); }} alUnir={(a, b) => void unirAMano(a, b)} />}
    </Pagina>
  );
}

// ---------------------------------------------------------------- Una sugerencia

type PropsDeComparar = { sugerencia: Sugerencia; primera: boolean; quieto: boolean; alUnir: (lado: Lado) => void; alDistintos: () => void };

function Comparar({ sugerencia, primera, quieto, alUnir, alDistintos }: PropsDeComparar) {
  const [queda, setQueda] = useState<Lado>("a");
  const porCodigo = sugerencia.motivo === "codigo_barras";
  const codigo = porCodigo ? sugerencia.a.codigo_barras ?? sugerencia.b.codigo_barras : null;
  return (
    <Tarjeta como="article" className="duplicados__sugerencia" data-testid="sugerencia">
      <p className="duplicados__por-que">
        <Pastilla tipo="info" icono={porCodigo ? "codigo-de-barras" : "etiqueta"}>{porCodigo ? "Mismo código de barras" : "Descripción muy parecida"}</Pastilla>
        {codigo && <span className="detalle">{codigo}</span>}
      </p>

      <div className="duplicados__comparar" role="group" aria-label="Tocá el nombre que tiene que quedar">
        {(["a", "b"] as const).map((lado) => {
          const f = sugerencia[lado];
          const proveedor = f.proveedor ?? "Sin proveedor";
          return (
            <button key={lado} type="button" aria-pressed={queda === lado} className={clases("duplicados__ficha", queda === lado && "duplicados__ficha--queda")} onClick={() => setQueda(lado)} data-testid={`conservar-${lado}`}>
              <span className="duplicados__proveedor"><Iniciales nombre={proveedor} tono="marca" forma="cuadrada" />{proveedor}</span>
              <strong className="duplicados__nombre">{f.descripcion}</strong>
              <span className="duplicados__datos"><span>{f.marca ? `Marca ${f.marca}` : "Sin marca"}</span><span>{f.costo_neto ? <>Costo <strong>{pesosConCentavos(f.costo_neto)}</strong></> : "Sin costo"}</span></span>
              <span className="duplicados__eleccion">
                {queda === lado ? <><Icono nombre="tilde" tam={18} grosor={2.4} />Queda este nombre</> : "Tocá para que quede este nombre"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="duplicados__acciones">
        <Boton disabled={quieto} onClick={alDistintos} data-testid="rechazar">Son distintos</Boton>
        <Boton variante={primera ? "principal" : "secundario"} disabled={quieto} onClick={() => alUnir(queda)} data-testid="unir">Es el mismo</Boton>
      </div>
    </Tarjeta>
  );
}

// ---------------------------------------------------------------- Hoja: unir dos a mano

function UnirAMano({ error, ocupado, alCerrar, alUnir }: { error: string | null; ocupado: boolean; alCerrar: () => void; alUnir: (queda: Producto, sale: Producto) => void }) {
  const { catalogo, error: errorDelCatalogo, buscarProductos } = useCatalogo();
  const [uno, setUno] = useState<Producto | null>(null);
  const [otro, setOtro] = useState<Producto | null>(null);
  const [revisado, setRevisado] = useState(false);

  const falta = !uno || !otro ? "Elegí los dos productos." : uno.id === otro.id ? "Son el mismo producto: elegí dos distintos." : null;

  return (
    <Hoja abierta alCerrar={alCerrar} titulo="Unir dos a mano" testId="union-manual">
      {!catalogo && !errorDelCatalogo && <Cargando texto="Bajando el catálogo…" />}
      {!catalogo && errorDelCatalogo && <Aviso tipo="error" titulo="No se pudo bajar el catálogo">{errorDelCatalogo}</Aviso>}
      {catalogo && (
        <>
          <Elegir titulo="El que queda" etiqueta="Buscar el producto que queda" testId="conservar" buscarProductos={buscarProductos} elegido={uno} alElegir={setUno} />
          <Elegir titulo="El que se le une" etiqueta="Buscar el producto que se une" testId="absorber" buscarProductos={buscarProductos} elegido={otro} alElegir={setOtro} />
          {revisado && falta && <Aviso tipo="alerta" titulo={falta} testId="falta-elegir" />}
          {error && <Aviso tipo="error" titulo="No se pudieron unir" testId="error-duplicados">{error}</Aviso>}
          <Boton variante="principal" tam="grande" ancho icono="unir" disabled={ocupado} onClick={() => { setRevisado(true); if (!falta && uno && otro) alUnir(uno, otro); }} data-testid="unir-manual">{ocupado ? "Uniendo…" : "Unir"}</Boton>
        </>
      )}
    </Hoja>
  );
}

type PropsDeElegir = { titulo: string; etiqueta: string; testId: string; buscarProductos: (consulta: string, maximo?: number) => Producto[]; elegido: Producto | null; alElegir: (p: Producto | null) => void };

function Elegir({ titulo, etiqueta, testId, buscarProductos, elegido, alElegir }: PropsDeElegir) {
  const [consulta, setConsulta] = useState("");
  const encontrados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, MAXIMO_DE_RESULTADOS) : []), [buscarProductos, consulta]);
  return (
    <div className="duplicados__elegir">
      <h3>{titulo}</h3>
      {elegido ? (
        <div className="duplicados__elegido" data-testid={`elegido-${testId}`}>
          <span><strong>{elegido.descripcion}</strong><span>{[elegido.marca, elegido.proveedor].filter(Boolean).join(" · ")}</span></span>
          <Boton tam="chico" onClick={() => { alElegir(null); setConsulta(""); }}>Cambiar</Boton>
        </div>
      ) : (
        <>
          <Buscador valor={consulta} alCambiar={setConsulta} etiqueta={etiqueta} placeholder="Escribí el nombre del producto" testId={`buscar-${testId}`}
            alTeclear={(e) => { if (e.key === "Enter" && encontrados[0]) { e.preventDefault(); alElegir(encontrados[0]); } }} />
          {consulta.trim() !== "" && (
            <div className="duplicados__resultados">
              {encontrados.map((p) => (
                <button key={p.id} type="button" className="duplicados__resultado" onClick={() => alElegir(p)} data-testid={`opcion-${testId}`}>
                  <strong>{p.descripcion}</strong><span>{[p.marca, p.proveedor].filter(Boolean).join(" · ")}</span>
                </button>
              ))}
              {encontrados.length === 0 && <p>No hay productos con «{consulta.trim()}».</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
