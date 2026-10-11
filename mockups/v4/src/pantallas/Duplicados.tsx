import { useEffect, useState } from "react";
import { useAlmacen } from "../almacen";
import { buscarProductos, pesosConCentavos, proveedorDe, type Producto } from "../datos";
import {
  avisar, Aviso, Boton, Buscador, Cargando, clases, ErrorDeCarga, Hoja, Icono, Iniciales, Lista, Pagina, Pastilla, Renglon, Tarjeta, TituloDeSeccion, Vacio,
  useEstadoDeMaqueta, type EstadoDeMaqueta,
} from "../piezas";
import { cambiarParametro } from "../ruta";
import "../estilos/duplicados.css";

const ESTADOS: EstadoDeMaqueta[] = [
  { clave: "normal", nombre: "Normal" },
  { clave: "vacio", nombre: "Sin duplicados para revisar" },
  { clave: "cargando", nombre: "Buscando duplicados" },
  { clave: "error", nombre: "No se pudo cargar" },
];

// ---------------------------------------------------------------- Datos de la pantalla

/** Cómo figura un producto en la lista de un proveedor. */
type Ficha = { nombre: string; marca: string; proveedor: string; costo: number };

type Sugerencia = { id: string; porQue: "codigo" | "descripcion"; codigo?: string; fichas: [Ficha, Ficha] };

/** Dos fichas ya unidas: `queda` es el nombre que se eligió y `otro` el que quedó como segundo nombre. */
type Union = { id: string; queda: Ficha; otro: Ficha; origen: Sugerencia | null };

// Las sugerencias y los unidos no están en los datos comunes: viven acá mientras dura la maqueta.
const SUGERENCIAS: Sugerencia[] = [
  {
    id: "s1", porQue: "codigo", codigo: "7790001000015",
    fichas: [
      { nombre: "Mecha madera Bosch 6mm", marca: "Bosch", proveedor: "Comodo", costo: 1649.14 },
      { nombre: "Mecha 6 mm madera", marca: "Bosch", proveedor: "Tresge", costo: 1764.5 },
    ],
  },
  {
    id: "s2", porQue: "descripcion",
    fichas: [
      { nombre: "Cinta aisladora negra 20 m", marca: "Tacsa", proveedor: "Ixnova", costo: 780.5 },
      { nombre: "Cinta aisl. negra 20mts", marca: "Tacsa", proveedor: "Comodo", costo: 812 },
    ],
  },
  {
    id: "s3", porQue: "descripcion",
    fichas: [
      { nombre: "Llave francesa 10 pulgadas", marca: "Bahco", proveedor: "Tresge", costo: 16800 },
      { nombre: "Llave ajustable 10\" cromada", marca: "Bahco", proveedor: "Erpa", costo: 17250 },
    ],
  },
];

const UNIDOS: Union[] = [
  {
    id: "u1", origen: null,
    queda: { nombre: "Taladro inalámbrico 18 V con dos baterías", marca: "Bosch", proveedor: "Erpa", costo: 122500 },
    otro: { nombre: "Taladro a batería 18V c/2 bat.", marca: "Bosch", proveedor: "Ixnova", costo: 124900 },
  },
];

let guardado = { cola: SUGERENCIAS, unidos: UNIDOS };

function fichaDe(p: Producto): Ficha {
  return { nombre: p.nombre, marca: p.marca, proveedor: proveedorDe(p.proveedores[0]?.proveedorId ?? "")?.nombre ?? "Sin proveedor", costo: p.costo ?? 0 };
}

// ---------------------------------------------------------------- Pantalla

export default function Duplicados() {
  const estado = useEstadoDeMaqueta();
  const [datos, setDatosLocal] = useState(guardado);
  const [aMano, setAMano] = useState(false);

  function setDatos(cambio: (antes: typeof guardado) => typeof guardado) {
    guardado = cambio(guardado);
    setDatosLocal(guardado);
  }

  const cola = estado === "vacio" ? [] : datos.cola;
  const { unidos } = datos;

  function unir(s: Sugerencia, cual: 0 | 1) {
    const union: Union = { id: `u-${s.id}`, queda: s.fichas[cual], otro: s.fichas[cual === 0 ? 1 : 0], origen: s };
    const lugar = datos.cola.findIndex((x) => x.id === s.id);
    setDatos((d) => ({ cola: d.cola.filter((x) => x.id !== s.id), unidos: [union, ...d.unidos] }));
    avisar("Unidos en un solo producto", {
      detalle: `Quedó «${union.queda.nombre}».`,
      accion: { texto: "Deshacer", alTocar: () => setDatos((d) => ({ cola: [...d.cola.slice(0, lugar), s, ...d.cola.slice(lugar)], unidos: d.unidos.filter((u) => u.id !== union.id) })) },
    });
  }

  function sonDistintos(s: Sugerencia) {
    const lugar = datos.cola.findIndex((x) => x.id === s.id);
    setDatos((d) => ({ ...d, cola: d.cola.filter((x) => x.id !== s.id) }));
    avisar("Anotado: son distintos", {
      detalle: "No se vuelve a sugerir.",
      accion: { texto: "Deshacer", alTocar: () => setDatos((d) => ({ ...d, cola: [...d.cola.slice(0, lugar), s, ...d.cola.slice(lugar)] })) },
    });
  }

  function separar(u: Union) {
    const lugar = unidos.findIndex((x) => x.id === u.id);
    setDatos((d) => ({ ...d, unidos: d.unidos.filter((x) => x.id !== u.id) }));
    avisar("Separados: vuelven a ser dos productos", {
      accion: { texto: "Volver a unir", alTocar: () => setDatos((d) => ({ ...d, unidos: [...d.unidos.slice(0, lugar), u, ...d.unidos.slice(lugar)] })) },
    });
  }

  function unirAMano(a: Producto, b: Producto) {
    const union: Union = { id: `u-${a.id}-${b.id}`, queda: fichaDe(a), otro: fichaDe(b), origen: null };
    setDatos((d) => ({ ...d, unidos: [union, ...d.unidos.filter((u) => u.id !== union.id)] }));
    setAMano(false);
    avisar("Unidos en un solo producto", { detalle: `Quedó «${union.queda.nombre}».`, accion: { texto: "Deshacer", alTocar: () => setDatos((d) => ({ ...d, unidos: d.unidos.filter((u) => u.id !== union.id) })) } });
  }

  if (estado === "cargando" || estado === "error") {
    return (
      <Pagina titulo="Duplicados" estados={ESTADOS}>
        {estado === "cargando" ? <Cargando texto="Buscando productos repetidos…" /> : <ErrorDeCarga titulo="No se pudieron cargar los duplicados" alReintentar={() => cambiarParametro("estado", null)}>Revisá la conexión y probá de nuevo.</ErrorDeCarga>}
      </Pagina>
    );
  }

  return (
    <Pagina titulo="Duplicados" estados={ESTADOS}>
      <div className="duplicados__entrada">
        <p>A veces el mismo producto figura dos veces, con nombres distintos en la lista de cada proveedor. Si los unís queda uno solo, con los dos costos.</p>
        <Boton tam="chico" icono="unir" onClick={() => setAMano(true)}>Unir dos a mano</Boton>
      </div>

      {cola.length === 0 ? (
        <Vacio icono="tilde" titulo="No hay duplicados para revisar">Cuando subas una lista de precios y aparezca un producto que parece repetido, lo vas a ver acá.</Vacio>
      ) : (
        <>
          <TituloDeSeccion titulo="¿Son el mismo producto?">{cola.length === 1 ? "1 para revisar" : `${cola.length} para revisar`}</TituloDeSeccion>
          <div className="duplicados__cola">
            {cola.map((s, i) => <Comparar key={s.id} sugerencia={s} primera={i === 0} alUnir={(cual) => unir(s, cual)} alDistintos={() => sonDistintos(s)} />)}
          </div>
        </>
      )}

      {unidos.length > 0 && (
        <>
          <TituloDeSeccion titulo="Ya unidos">{unidos.length === 1 ? "1 producto" : `${unidos.length} productos`}</TituloDeSeccion>
          <Lista>
            {unidos.map((u) => (
              <Renglon
                key={u.id}
                titulo={u.queda.nombre}
                detalle={<>También figura como «{u.otro.nombre}» · {u.queda.proveedor} y {u.otro.proveedor}</>}
                fin={<Boton tam="chico" icono="separar" aria-label={`Separar ${u.queda.nombre}`} onClick={() => separar(u)}>Separar</Boton>}
              />
            ))}
          </Lista>
        </>
      )}

      <UnirAMano abierta={aMano} alCerrar={() => setAMano(false)} alUnir={unirAMano} />
    </Pagina>
  );
}

// ---------------------------------------------------------------- Una sugerencia

function Comparar({ sugerencia, primera, alUnir, alDistintos }: { sugerencia: Sugerencia; primera: boolean; alUnir: (cual: 0 | 1) => void; alDistintos: () => void }) {
  const [queda, setQueda] = useState<0 | 1>(0);
  return (
    <Tarjeta como="article" className="duplicados__sugerencia">
      <p className="duplicados__por-que">
        <Pastilla tipo="info" icono={sugerencia.porQue === "codigo" ? "codigo-de-barras" : "etiqueta"}>
          {sugerencia.porQue === "codigo" ? "Mismo código de barras" : "Descripción muy parecida"}
        </Pastilla>
        {sugerencia.codigo && <span className="detalle">{sugerencia.codigo}</span>}
      </p>

      <div className="duplicados__comparar" role="group" aria-label="Tocá el nombre que tiene que quedar">
        {sugerencia.fichas.map((f, i) => (
          <button key={f.proveedor} type="button" aria-pressed={queda === i} className={clases("duplicados__ficha", queda === i && "duplicados__ficha--queda")} onClick={() => setQueda(i as 0 | 1)}>
            <span className="duplicados__proveedor"><Iniciales nombre={f.proveedor} tono="marca" forma="cuadrada" />{f.proveedor}</span>
            <strong className="duplicados__nombre">{f.nombre}</strong>
            <span className="duplicados__datos"><span>Marca {f.marca}</span><span>Costo <strong>{pesosConCentavos(f.costo)}</strong></span></span>
            <span className="duplicados__eleccion">
              {queda === i ? <><Icono nombre="tilde" tam={18} grosor={2.4} />Queda este nombre</> : "Tocá para que quede este nombre"}
            </span>
          </button>
        ))}
      </div>

      <div className="duplicados__acciones">
        <Boton onClick={alDistintos}>Son distintos</Boton>
        <Boton variante={primera ? "principal" : "secundario"} onClick={() => alUnir(queda)}>Es el mismo</Boton>
      </div>
    </Tarjeta>
  );
}

// ---------------------------------------------------------------- Hoja: unir dos a mano

function UnirAMano({ abierta, alCerrar, alUnir }: { abierta: boolean; alCerrar: () => void; alUnir: (a: Producto, b: Producto) => void }) {
  const productos = useAlmacen((a) => a.productos);
  const [uno, setUno] = useState<Producto | null>(null);
  const [otro, setOtro] = useState<Producto | null>(null);
  const [revisado, setRevisado] = useState(false);
  useEffect(() => { if (abierta) { setUno(null); setOtro(null); setRevisado(false); } }, [abierta]);

  const falta = !uno || !otro ? "Elegí los dos productos." : uno.id === otro.id ? "Son el mismo producto: elegí dos distintos." : null;

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Unir dos a mano">
      <Elegir titulo="El que queda" etiqueta="Buscar el producto que queda" productos={productos} elegido={uno} alElegir={setUno} />
      <Elegir titulo="El que se le une" etiqueta="Buscar el producto que se une" productos={productos} elegido={otro} alElegir={setOtro} />
      {revisado && falta && <Aviso tipo="alerta" titulo={falta} />}
      <Boton variante="principal" tam="grande" ancho icono="unir" onClick={() => { setRevisado(true); if (!falta && uno && otro) alUnir(uno, otro); }}>Unir</Boton>
    </Hoja>
  );
}

function Elegir({ titulo, etiqueta, productos, elegido, alElegir }: { titulo: string; etiqueta: string; productos: Producto[]; elegido: Producto | null; alElegir: (p: Producto | null) => void }) {
  const [consulta, setConsulta] = useState("");
  const encontrados = buscarProductos(productos, consulta).slice(0, 4);
  return (
    <div className="duplicados__elegir">
      <h3>{titulo}</h3>
      {elegido ? (
        <div className="duplicados__elegido">
          <span><strong>{elegido.nombre}</strong><span>{elegido.marca}</span></span>
          <Boton tam="chico" onClick={() => { alElegir(null); setConsulta(""); }}>Cambiar</Boton>
        </div>
      ) : (
        <>
          <Buscador valor={consulta} alCambiar={setConsulta} etiqueta={etiqueta} placeholder="Escribí el nombre del producto" />
          {consulta.trim() !== "" && (
            <div className="duplicados__resultados">
              {encontrados.map((p) => (
                <button key={p.id} type="button" className="duplicados__resultado" onClick={() => alElegir(p)}>
                  <strong>{p.nombre}</strong><span>{p.marca}</span>
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
