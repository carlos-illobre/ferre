import type { ReactNode } from "react";
import { irA } from "../rutas";
import "../estilos/manual.css";

// El manual de uso (RF-97, specs/012-manual-de-uso): lo abre «Ver tutorial» en la entrada de la
// computadora, sin sesión y en la misma pestaña. Un capítulo por pantalla principal; los que faltan
// escribir dicen «pronto». Copia la maqueta aprobada (maquetas/manual-entrar.html). Las capturas y
// el clip están en public/manual/<capítulo>/ y los arma tests/capturas/tutorial/<capítulo>.py con la
// aplicación de verdad; no se guardan para usar sin conexión.
const ARCHIVOS = `${import.meta.env.BASE_URL}manual/`;

export const CAPITULOS: { nombre: string; escrito?: boolean; secciones?: { id: string; nombre: string }[] }[] = [
  { nombre: "Entrar", escrito: true, secciones: [
    { id: "con-el-celular", nombre: "Con el celular" },
    { id: "otras-formas", nombre: "Otras formas" },
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

// Una marca numerada sobre una captura, en porcentaje de la imagen: un punto o, con ancho y alto,
// un recuadro alrededor del botón que se toca, con el número en su borde derecho (o, si adentro no
// hay lugar, `fuera`, al lado). Las posiciones las imprime tests/capturas/tutorial/entrar.py.
type Marca = { x: number; y: number; ancho?: number; alto?: number; fuera?: boolean; texto: string };

function Figura({ src, alt, numero, pie, celular, ancho, marcas }: { src: string; alt: string; numero: string; pie: string; celular?: boolean; ancho?: number; marcas?: Marca[] }) {
  return (
    <figure className="manual-figura">
      <div className={`manual-imagen ${celular ? "celular" : ""}`} style={ancho ? { width: ancho } : undefined}>
        <img src={ARCHIVOS + src} alt={alt} loading="lazy" />
        {marcas?.map((m, i) => m.ancho !== undefined && m.alto !== undefined
          ? <span key={i} className={`manual-recuadro${m.fuera ? " fuera" : ""}`} style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.ancho}%`, height: `${m.alto}%` }} aria-hidden="true"><span className="manual-marca">{i + 1}</span></span>
          : <span key={i} className="manual-marca" style={{ left: `${m.x}%`, top: `${m.y}%` }} aria-hidden="true">{i + 1}</span>)}
      </div>
      {marcas && <ol className="manual-leyenda" data-testid="manual-leyenda">{marcas.map((m, i) => <li key={i}><span aria-hidden="true">{i + 1}</span>{m.texto}</li>)}</ol>}
      <figcaption><b>Figura {numero}</b> · {pie}</figcaption>
    </figure>
  );
}

const Boton = ({ children }: { children: ReactNode }) => <span className="manual-boton-ui">{children}</span>;

function CapituloEntrar() {
  const marcas: Marca[] = [
    { x: 60.8, y: 23, texto: "El código que lee el celular." },
    { x: 75.2, y: 23, texto: "Los dos pasos, por si te olvidás." },
    { x: 60.8, y: 48.5, texto: "El código cambia solo cada 5 minutos: si se venció, leé el que está a la vista." },
    { x: 60.8, y: 62.5, texto: "La otra forma de entrar, con tu cuenta de Google (más abajo)." },
  ];
  return (
    <article data-testid="manual-entrar">
      <p className="manual-capitulo">Capítulo 1</p>
      <h1>Entrar a Ferrebress</h1>
      <p className="manual-entrada">Ferrebress no usa contraseñas. En la computadora entrás con tu celular, leyendo un
        código que aparece en la pantalla. Tarda unos segundos.</p>
      <div className="manual-resumen">
        <div><strong>Qué necesitás</strong>Tu celular con Ferrebress y tu cuenta de Google autorizada.</div>
        <div><strong>Cuánto tarda</strong>Menos de un minuto la primera vez; después, unos segundos.</div>
        <div><strong>Dónde se hace</strong>En la pantalla de entrada de la computadora.</div>
      </div>
      <Nota tipo="importante"><b>Antes de empezar:</b> solo entran las personas que un Administrador del negocio autorizó. Si
        es tu primera vez, pedile que agregue tu correo de Google en <b>Más → Usuarios</b>.</Nota>

      <h2 id="con-el-celular" tabIndex={-1}>Entrar en la computadora con el celular</h2>
      <p>Es la forma más rápida: la computadora muestra un código, el celular lo lee y la computadora entra sola, con tu usuario.</p>
      <figure className="manual-clip">
        <video src={`${ARCHIVOS}entrar/clip.mp4`} poster={`${ARCHIVOS}entrar/clip-portada.jpg`} controls muted playsInline preload="metadata" data-testid="manual-clip"
          aria-label="Clip: la computadora muestra el código, el celular lo lee y deja entrar, y la computadora entra sola" />
        <figcaption><b>Mirá cómo se hace.</b> A la izquierda, la computadora; a la derecha, el celular. <span>Sin sonido</span></figcaption>
      </figure>

      <Paso numero={1} titulo="Abrí Ferrebress en la computadora">
        <p>Aparece la pantalla de entrada, con el código ya listo. No hace falta tocar nada.</p>
        <Figura src="entrar/compu-codigo.png" alt="La pantalla de entrada de la computadora, con el código para leer con el celular" numero="1.1" pie="La entrada de la computadora." marcas={marcas} />
      </Paso>
      <Paso numero={2} titulo="Leé el código con el celular" celular={
        <Figura src="entrar/celu-entrada.png" alt="La entrada del celular, con el botón para escanear el código de la computadora" numero="1.2" pie="En el celular, «Escanear el código de la computadora»." celular
          marcas={[{ x: 5.6, y: 49.1, ancho: 88.7, alto: 9.6, texto: "Tocá acá para leer el código de la computadora." }]} />
      }>
        <p>Abrí Ferrebress en el celular y tocá <Boton>Escanear el código de la computadora</Boton>. Apuntá la cámara al
          código de la pantalla. También sirve la cámara del teléfono, sin abrir Ferrebress.</p>
        <p>Si es la primera vez en ese celular, antes entrá con <Boton>Continuar con Google</Boton> (más abajo, en «Otras formas de entrar»).</p>
      </Paso>
      <Paso numero={3} titulo="Confirmá en el celular" celular={
        <Figura src="entrar/celu-dejar-entrar.png" alt="El celular pregunta si entrar en la computadora" numero="1.3" pie="El celular pregunta antes de dejar entrar a la computadora." celular
          marcas={[
            { x: 5.6, y: 55.3, ancho: 88.7, alto: 6.6, texto: "Deja entrar a la computadora con tu usuario." },
            { x: 5.6, y: 64, ancho: 88.7, alto: 6.6, texto: "No la deja entrar: el celular sigue donde estaba." },
          ]} />
      }>
        <p>Si en el celular ya tenías la sesión abierta, pregunta <b>«¿Entrar en la computadora?»</b>: tocá <Boton>Entrar en la computadora</Boton>. Si no la tenías, poné la huella.</p>
        <p>Con «Ahora no», la computadora no entra y el celular sigue donde estaba.</p>
      </Paso>
      <Paso numero={4} titulo="Listo: la computadora entra sola">
        <p>En unos segundos la computadora entra con tu usuario, y el celular avisa arriba <b>«Listo: la computadora entró como …»</b>. Los dos siguen con lo suyo.</p>
        <div className="manual-par">
          <Figura src="entrar/compu-adentro.png" alt="La computadora, ya adentro de Ferrebress" numero="1.4" pie="La computadora, ya adentro."
            marcas={[{ x: 1.2, y: 90.5, ancho: 12.3, alto: 4.2, fuera: true, texto: "Tu usuario: la computadora entró como vos. «Salir» la cierra." }]} />
          <Figura src="entrar/celu-despues.png" alt="El celular avisa que la computadora entró" numero="1.5" pie="El aviso en el celular." celular ancho={170}
            marcas={[{ x: 5.1, y: 3.4, ancho: 89.7, alto: 3.6, texto: "El aviso de que la computadora entró." }]} />
        </div>
      </Paso>
      <Nota tipo="consejo"><b>De paso, quedan vinculados.</b> El celular que dejó entrar a la computadora queda unido a ella: lo
        que escanees con el celular aparece en la computadora, y desde la computadora le podés pedir fotos. Y van juntos: si cambiás
        de pantalla en el celular, la computadora va sola a la misma.</Nota>
      <figure className="manual-clip chico">
        <video src={`${ARCHIVOS}entrar/clip-espejo.mp4`} poster={`${ARCHIVOS}entrar/clip-espejo-portada.jpg`} controls muted playsInline preload="metadata" data-testid="manual-clip-espejo"
          aria-label="Clip: en el celular se toca Vender, Depósito y Catálogo, y la computadora va sola a cada una" />
        <figcaption><b>Van juntos.</b> Se toca en el celular, a la derecha, y la computadora lo sigue. <span>Sin sonido</span></figcaption>
      </figure>

      <h2 id="otras-formas" tabIndex={-1}>Otras formas de entrar</h2>
      <h3>Con tu cuenta de Google</h3>
      <p>En la entrada de la computadora o del celular, tocá <Boton>Continuar con Google</Boton> y elegí tu cuenta. Es la forma de entrar la primera vez en un celular.</p>
      <h3>Con la huella</h3>
      <p>En un celular que ya vinculaste con tu cuenta, tocá <Boton>Entrar con la huella</Boton>. La primera vez que entrás con Google desde un
        celular, Ferrebress te ofrece vincularlo; también se hace desde <b>Más → Usuarios</b>, en la pestaña «Sesiones».</p>

      <h2 id="problemas" tabIndex={-1}>Si algo no funciona</h2>
      <table className="manual-problemas">
        <thead><tr><th>Qué pasa</th><th>Qué hacer</th></tr></thead>
        <tbody>
          <tr><td>Dice «No autorizado»</td><td>Tu correo de Google no está autorizado. Pedile a un Administrador que lo agregue en <b>Más → Usuarios</b>, o probá con otra cuenta.</td></tr>
          <tr><td>El celular dice que el código venció</td><td>El código dura 5 minutos y sirve una sola vez. Leé el que la computadora muestra ahora.</td></tr>
          <tr><td>No aparece el código</td><td>La computadora no tiene internet. Cuando vuelva la conexión, el código aparece solo.</td></tr>
          <tr><td>No se pudo leer la huella</td><td>Probá de nuevo, o entrá con tu cuenta de Google.</td></tr>
          <tr><td>Dice «Hay que iniciar sesión»</td><td>La sesión de ese dispositivo se cerró o venció. Entrá de nuevo.</td></tr>
        </tbody>
      </table>
      <Figura src="entrar/compu-no-autorizado.png" alt="El aviso de correo no autorizado en la entrada de la computadora" numero="1.6" pie="Así se ve cuando el correo no está autorizado." ancho={420}
        marcas={[{ x: 7.2, y: 61.4, ancho: 85.6, alto: 18.2, texto: "El aviso: ese correo de Google no está autorizado." }]} />
    </article>
  );
}
