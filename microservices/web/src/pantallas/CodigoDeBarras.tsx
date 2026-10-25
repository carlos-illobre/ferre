import { createPortal } from "react-dom";
import { Escaner } from "../plataforma/camara";
import { TEXTOS } from "./textos";
import { useCodigoDeBarras, type CodigoDeBarrasEnUso, type Props } from "./codigo-de-barras-uso";
import { Avisos, BotonEscanear, CajaDelCodigo, CodigoActualizado, PanelParaTipear, Reloj } from "./codigo-de-barras-piezas";
import "./codigo-de-barras.css";

const t = TEXTOS.ficha;

function Lectura({ c }: { c: CodigoDeBarrasEnUso }) {
  if (c.recienCargado || !c.lectura) return null;
  return <span className="cb-lectura" data-testid="ultima-lectura"><Reloj />{t.ultimaLectura.largo}: {c.lectura}</span>;
}
const Escanear = ({ c }: { c: CodigoDeBarrasEnUso }) => (c.abierto ? null : <BotonEscanear etiqueta={c.etiqueta} alTocar={c.abrir} />);
const hayLectura = (c: CodigoDeBarrasEnUso) => !c.recienCargado && Boolean(c.lectura);

// Como la v2 (decisión 145): la caja lleva las barras dibujadas, el número y copiar; «Escanear»
// es el botón oscuro. En la computadora la última lectura va adentro de la caja y el botón al
// lado; en el celular, la lectura y el botón van en el renglón de abajo.
function EnLaCompu({ c }: { c: CodigoDeBarrasEnUso }) {
  return (
    <div className="cb-fila">
      <CajaDelCodigo codigo={c.p.codigo_barras} caja={c.caja} lectura={<Lectura c={c} />} alCopiar={(x) => void c.copiar(x)} />
      <Escanear c={c} />
    </div>
  );
}
function EnElCelular({ c }: { c: CodigoDeBarrasEnUso }) {
  return (
    <>
      <div className="cb-fila"><CajaDelCodigo codigo={c.p.codigo_barras} caja={c.caja} lectura={false} alCopiar={(x) => void c.copiar(x)} /></div>
      {(hayLectura(c) || !c.abierto) && <div className="cb-abajo">{hayLectura(c) ? <Lectura c={c} /> : <span />}<Escanear c={c} /></div>}
    </>
  );
}

// Con el panel abierto: la cámara, en el celular; si no, el número tipeado.
function ParaCargar({ c }: { c: CodigoDeBarrasEnUso }) {
  if (!c.abierto) return null;
  if (c.conCamara) return createPortal(<Escaner alDetectar={c.alDetectar} alCerrar={() => c.setAbierto(false)} ultimo={c.g.error} />, document.body);
  return <PanelParaTipear error={c.g.error} conPuesto={c.conPuesto} celular={c.celular} alGuardar={(x) => void c.g.guardar(x)} alCancelar={() => { c.setAbierto(false); c.g.setError(null); }} alTipear={() => c.g.setError(null)} />;
}

// El código de barras de un producto, en su ficha (RF-08): se ve el que tiene y se le carga
// uno escaneándolo. En el celular, con la cámara; en la computadora, con el celular vinculado
// o tipeándolo. Lo usan las dos interfaces, para que la regla y las palabras sean las mismas.
// Una vez guardado, el producto se encuentra escaneándolo en Vender, Catálogo, Ingreso y Estanterías.
// Guarda la pantalla que lo contiene (`alGuardar`), que es la que tiene el catálogo; `quienLoTiene`
// dice si otro producto ya tiene ese código. En la ficha renovada (specs/016) el código se copia
// con un toque y, después de cargarlo, dice «Código actualizado» con la hora de la lectura.
// `alCargar` avisa cuando se abre o se cierra el panel para cargar el código: mientras está abierto,
// lo que escanea el celular vinculado es para este producto, y la pantalla de atrás no lo busca.
export function CodigoDeBarras(props: Props) {
  const c = useCodigoDeBarras(props);
  return (
    <section className={`cb ${c.celular ? "cb-celular" : "cb-compu"}`} aria-label={t.codigo.largo} data-testid="codigo-de-barras">
      <h3 className="cb-titulo">{t.codigo.largo}</h3>
      {c.celular ? <EnElCelular c={c} /> : <EnLaCompu c={c} />}
      {c.recienCargado && <CodigoActualizado lectura={c.lectura} />}
      <Avisos aviso={c.g.aviso} copiado={c.copiado} error={c.abierto ? null : c.g.error} />
      <ParaCargar c={c} />
    </section>
  );
}
