import { Boton, Clip, Nota, Paso, Tarjetas, Titulo, type Dispositivo } from "./piezas";
import { Captura, FORMAS } from "./Entrar-piezas";
import { SeccionCompuCelular, SeccionCompuGoogle, SeccionCompuHuella } from "./Entrar-secciones";

export { SECCIONES_DE_ENTRAR } from "./Entrar-piezas";

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
      <SeccionCompuCelular />
      <SeccionCompuGoogle />
      <SeccionCompuHuella />
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
