import type { ReactNode } from "react";
import { irA } from "../rutas";
import MARCAS from "./manual-entrar-marcas.json";
import "../estilos/manual.css";

// El manual de uso (RF-97, specs/012-manual-de-uso): lo abre «Ver tutorial» en la entrada de la
// computadora, sin sesión y en la misma pestaña. Un capítulo por pantalla principal; los que faltan
// escribir dicen «pronto». Copia la maqueta aprobada (maquetas/manual-entrar.html). Las capturas y
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

export function Manual() {
  return (
    <div className="manual" data-testid="manual">
      <header className="manual-barra">
        <img src={`${import.meta.env.BASE_URL}logotipo-ferrebress.png`} alt="Ferrebress" />
        <span className="manual-titulo">Manual de uso</span>
        <button type="button" className="manual-volver" onClick={() => irA("")} data-testid="manual-volver">← Volver a Ferrebress</button>
      </header>
      <div className="manual-marco">
        <nav className="manual-indice" aria-label="Capítulos">
          <h2>Capítulos</h2>
          <ol>
            {CAPITULOS.map((c, i) => (
              <li key={c.nombre} className={c.escrito ? "actual" : "pronto"} data-testid="manual-capitulo">
                {c.escrito
                  ? <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-current="page"><b>{i + 1}</b>{c.nombre}</button>
                  : <span aria-disabled="true"><b>{i + 1}</b>{c.nombre}<em>pronto</em></span>}
                {c.secciones && (
                  <ul>{c.secciones.map((s) => <li key={s.id}><button type="button" onClick={() => irASeccion(s.id)}>{s.nombre}</button></li>)}</ul>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <main className="manual-hoja" id="contenido" tabIndex={-1}>
          <CapituloEntrar />
          <nav className="manual-pie">
            <span>Este es el primer capítulo</span>
            <span>Siguiente: {CAPITULOS[1]?.nombre} (pronto) →</span>
          </nav>
        </main>
      </div>
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
  return (
    <figure className={`manual-clip${chico ? " chico" : ""}${celular ? " celu" : ""}`}>
      <video src={`${ARCHIVOS}entrar/${nombre}.mp4`} poster={`${ARCHIVOS}entrar/${nombre}-portada.jpg`} controls muted playsInline preload="metadata" data-testid={testId} aria-label={etiqueta} />
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
