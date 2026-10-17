import MARCAS from "../manual-entrar-marcas.json";
import { Boton, Clip, Figura, Nota, Paso, Tarjetas, Titulo, type Dispositivo } from "./piezas";

// El capítulo «Entrar» (012-T010, maqueta manual-entrar-v2.html; repartido por dispositivo en
// 012-T013, maqueta manual-dispositivo.html): para el empleado de mostrador, una sección por cada
// forma de entrar en el dispositivo elegido, con frases cortas y una acción por paso. Entrar a la
// computadora con el celular va con la computadora (decisión 109).
type Captura = keyof typeof MARCAS;
const Captura = (p: { captura: Captura; alt: string; numero: string; pie: string; celular?: boolean; ancho?: number }) =>
  <Figura carpeta="entrar" marcas={MARCAS[p.captura]} {...p} />;

export const SECCIONES_DE_ENTRAR = [
  { id: "cual", nombre: "¿Cuál uso?" },
  { id: "compu-celular", nombre: "Con el celular", de: "compu" },
  { id: "compu-google", nombre: "Con Google", de: "compu" },
  { id: "compu-huella", nombre: "Con la huella", de: "compu" },
  { id: "celu-google", nombre: "Con Google", de: "celu" },
  { id: "celu-huella", nombre: "Con la huella", de: "celu" },
  { id: "problemas", nombre: "Si algo no funciona" },
] as const;

const FORMAS: Record<Dispositivo, { id: string; nombre: string; detalle: string }[]> = {
  compu: [
    { id: "compu-celular", nombre: "Con el celular", detalle: "La más rápida. La computadora muestra un código y el celular lo lee." },
    { id: "compu-google", nombre: "Con Google", detalle: "Si no tenés el celular a mano." },
    { id: "compu-huella", nombre: "Con la huella", detalle: "Solo si la computadora tiene lector de huella." },
  ],
  celu: [
    { id: "celu-google", nombre: "Con Google", detalle: "La primera vez que usás Ferrebress en ese celular." },
    { id: "celu-huella", nombre: "Con la huella", detalle: "Todas las veces siguientes. Un toque y el dedo." },
  ],
};

export function CapituloEntrar({ dispositivo }: { dispositivo: Dispositivo }) {
  const compu = dispositivo === "compu";
  return (
    <>
      <p className="manual-capitulo">Capítulo 1</p>
      <h1>Entrar a Ferrebress</h1>
      <p className="manual-entrada">{compu
        ? "En la computadora entrás leyendo un código con el celular, con tu cuenta de Google o con la huella. No hay contraseñas."
        : "En el celular entrás con tu cuenta de Google la primera vez y, después, con la huella. No hay contraseñas."}</p>
      <Nota tipo="importante"><b>Antes de la primera vez:</b> pedile a un Administrador que agregue tu correo de Google en <b>Más → Usuarios</b>. Si no, Ferrebress no te deja entrar.</Nota>

      <Titulo id="cual">¿Cuál uso?</Titulo>
      <p>Tocá una para ir directo.</p>
      <Tarjetas tarjetas={FORMAS[dispositivo]} testId="manual-formas" />
      {!compu && <Nota tipo="consejo"><b>¿Querés entrar a la computadora con el celular?</b> Elegí <b>Computadora</b>, arriba a la izquierda: está en «Con el celular».</Nota>}
      <Nota tipo="consejo"><b>Entrás una sola vez.</b> Ferrebress se acuerda de vos en ese celular o esa computadora. Te pide entrar de nuevo solo si tocás «Salir» o si pasan 90 días sin usarlo.</Nota>

      {compu ? <EnLaComputadora /> : <EnElCelular />}

      <Titulo id="problemas">Si algo no funciona</Titulo>
      <table className="manual-problemas">
        <thead><tr><th>Qué pasa</th><th>Qué hacer</th></tr></thead>
        <tbody>
          <tr><td>Dice «No autorizado»</td><td>Tu correo no está autorizado. Pedile a un Administrador que lo agregue en <b>Más → Usuarios</b>, o probá con otra cuenta.</td></tr>
          {compu && <tr><td>El celular dice que el código venció</td><td>El código cambia cada 5 minutos. Leé el que está ahora en la pantalla.</td></tr>}
          {compu && <tr><td>No aparece el código</td><td>La computadora no tiene internet. Cuando vuelva, el código aparece solo.</td></tr>}
          <tr><td>No se pudo leer la huella</td><td>Probá de nuevo, o entrá con Google.</td></tr>
          <tr><td>Dice «Este dispositivo no está vinculado»</td><td>En ese celular o computadora nunca activaste la huella. Entrá con Google.</td></tr>
          <tr><td>Dice «Hay que iniciar sesión»</td><td>Se cerró tu sesión en ese dispositivo. Entrá de nuevo.</td></tr>
        </tbody>
      </table>
      {compu && <Captura captura="compu-no-autorizado" alt="El aviso de correo no autorizado en la entrada de la computadora" numero="1.11" pie="Así se ve cuando el correo no está autorizado." ancho={420} />}
    </>
  );
}

function EnLaComputadora() {
  return (
    <>
      <Titulo id="compu-celular">Con el celular</Titulo>
      <p>La computadora muestra un código. El celular lo lee y la computadora entra sola, con tu nombre.</p>
      <Clip carpeta="entrar" nombre="clip-celular" testId="manual-clip" etiqueta="Clip: en el celular se toca Vincular, se apunta al código de la computadora y se la deja entrar; la computadora entra sola">
        <b>Mirá cómo se hace.</b> A la izquierda, la computadora; a la derecha, el celular.
      </Clip>
      <h3 className="manual-caso">Si en el celular ya tenés Ferrebress abierto</h3>
      <Paso numero={1} titulo="Abrí Ferrebress en la computadora">
        <p>Aparece el código. No toques nada.</p>
        <Captura captura="compu-codigo" alt="La entrada de la computadora, con el código para leer con el celular" numero="1.1" pie="La entrada de la computadora." />
      </Paso>
      <Paso numero={2} titulo="En el celular, tocá «Vincular»" celular={
        <Captura captura="celu-vincular" alt="El celular, con el botón Vincular arriba a la derecha" numero="1.2" pie="«Vincular», arriba a la derecha." celular />
      }>
        <p>Está arriba a la derecha, en cualquier pantalla. Se abre la cámara.</p>
      </Paso>
      <Paso numero={3} titulo="Apuntá al código" celular={
        <Captura captura="celu-camara" alt="La cámara del celular apuntando al código de la computadora" numero="1.3" pie="La cámara, leyendo el código." celular />
      }>
        <p>Apuntá la cámara al código de la computadora. Lo lee solo: no hay que sacar foto.</p>
      </Paso>
      <Paso numero={4} titulo="Tocá «Entrar en la computadora»" celular={
        <Captura captura="celu-dejar-entrar" alt="El celular pregunta si entrar en la computadora" numero="1.4" pie="La pregunta en el celular." celular />
      }>
        <p>El celular pregunta si dejás entrar a la computadora. Tocá <Boton>Entrar en la computadora</Boton>.</p>
      </Paso>
      <Paso numero={5} titulo="Listo">
        <p>En unos segundos la computadora entra con tu nombre. El celular avisa arriba.</p>
        <div className="manual-par">
          <Captura captura="compu-adentro" alt="La computadora, ya adentro de Ferrebress" numero="1.5" pie="La computadora, adentro." />
          <Captura captura="celu-despues" alt="El celular avisa que la computadora entró" numero="1.6" pie="El aviso." celular ancho={170} />
        </div>
      </Paso>
      <h3 className="manual-caso">Si en el celular todavía no entraste</h3>
      <Paso numero={1} titulo="Tocá «Escanear el código de la computadora»" celular={
        <Captura captura="celu-entrada-escanear" alt="La entrada del celular, con el botón para escanear el código de la computadora" numero="1.7" pie="La entrada del celular." celular />
      }>
        <p>Está en la entrada del celular.</p>
      </Paso>
      <Paso numero={2} titulo="Apuntá al código y poné la huella" celular={
        <Captura captura="celu-entrar-los-dos" alt="El celular ofrece entrar acá y en la computadora con la huella" numero="1.8" pie="Entrar en los dos, con la huella." celular />
      }>
        <p>Después de leer el código, tocá <Boton>Entrar acá y en la computadora</Boton> y poné la huella. Entran los dos a la vez.</p>
        <p>Si nunca usaste la huella en ese celular, tocá <Boton>Continuar con Google</Boton>.</p>
      </Paso>
      <Nota tipo="consejo"><b>De paso, quedan vinculados.</b> Lo que hacés en el celular aparece en la computadora: si cambiás de pantalla en uno, el otro va a la misma.</Nota>
      <Clip carpeta="entrar" nombre="clip-espejo" testId="manual-clip-espejo" etiqueta="Clip: en el celular se toca Vender, Depósito y Catálogo, y la computadora va sola a cada una" chico>
        <b>Van juntos.</b> Se toca en el celular, a la derecha, y la computadora lo sigue.
      </Clip>

      <Titulo id="compu-google">Con Google</Titulo>
      <p>Para entrar sin el celular.</p>
      <Clip carpeta="entrar" nombre="clip-google-compu" testId="manual-clip-google-compu" etiqueta="Clip: en la computadora se hace clic en Continuar con Google y Ferrebress se abre">
        <b>Mirá cómo se hace.</b> La ventana de Google no aparece en el clip.
      </Clip>
      <Paso numero={1} titulo="Hacé clic en «Continuar con Google»">
        <p>Es el botón azul, debajo del código.</p>
        <Captura captura="compu-google" alt="La entrada de la computadora, con el botón Continuar con Google" numero="1.9" pie="El botón de Google." />
      </Paso>
      <Paso numero={2} titulo="Elegí tu cuenta">
        <p>Se abre una ventana de Google. Hacé clic en tu correo, el que te autorizaron.</p>
        <p>Si tu correo no aparece, hacé clic en «Usar otra cuenta» y escribí tu correo y la contraseña de Google.</p>
      </Paso>
      <Paso numero={3} titulo="Listo">
        <p>Ferrebress se abre. Abajo a la izquierda está tu nombre.</p>
      </Paso>

      <Titulo id="compu-huella">Con la huella</Titulo>
      <p>Solo en una computadora con lector de huella que ya usaste para entrar con la huella.</p>
      <Paso numero={1} titulo="Hacé clic en «Entrar con la huella»">
        <p>Está arriba del botón de Google.</p>
        <Captura captura="compu-huella" alt="La entrada de la computadora, con el botón Entrar con la huella" numero="1.10" pie="El botón de la huella." />
      </Paso>
      <Paso numero={2} titulo="Poné el dedo en el lector">
        <p>La computadora te pide la huella (o el PIN de Windows). Ferrebress entra solo.</p>
      </Paso>
      <Nota tipo="consejo"><b>¿No aparece el botón?</b> Esa computadora todavía no tiene la huella. Entrá con Google y activala en <b>Más → Configuración</b>, en «Mis celulares con huella».</Nota>
    </>
  );
}

function EnElCelular() {
  return (
    <>
      <Titulo id="celu-google">Con Google</Titulo>
      <p>La primera vez que usás Ferrebress en un celular.</p>
      <Clip carpeta="entrar" nombre="clip-google-celu" testId="manual-clip-google-celu" etiqueta="Clip: en el celular se toca Continuar con Google, Ferrebress se abre y ofrece usar la huella" celular>
        <b>Mirá cómo se hace.</b> La ventana de Google no aparece en el clip.
      </Clip>
      <Paso numero={1} titulo="Tocá «Continuar con Google»" celular={
        <Captura captura="celu-google" alt="La entrada del celular, con el botón Continuar con Google" numero="1.1" pie="El botón de Google." celular />
      }>
        <p>Es el botón azul de arriba.</p>
      </Paso>
      <Paso numero={2} titulo="Elegí tu cuenta">
        <p>Google te muestra tus cuentas. Tocá la tuya, la que te autorizaron.</p>
      </Paso>
      <Paso numero={3} titulo="Activá la huella" celular={
        <Captura captura="celu-ofrecer-huella" alt="El celular pregunta si entrar con la huella" numero="1.2" pie="La pregunta de la huella." celular />
      }>
        <p>Ferrebress te pregunta si querés entrar con la huella. Tocá <Boton>Sí, usar la huella</Boton> y poné el dedo. La próxima vez entrás más rápido.</p>
      </Paso>

      <Titulo id="celu-huella">Con la huella</Titulo>
      <p>Todas las veces después de la primera.</p>
      <Paso numero={1} titulo="Tocá «Entrar con la huella»" celular={
        <Captura captura="celu-huella" alt="La entrada del celular, con el botón Entrar con la huella" numero="1.3" pie="El botón de la huella." celular />
      }>
        <p>Es el botón naranja.</p>
      </Paso>
      <Paso numero={2} titulo="Apoyá el dedo">
        <p>El teléfono te pide la huella, como cuando lo desbloqueás. Ferrebress se abre solo.</p>
      </Paso>
    </>
  );
}
