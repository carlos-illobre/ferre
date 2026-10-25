import { Boton, Clip, Nota, Paso, Titulo } from "./piezas";
import { Captura } from "./Entrar-piezas";

// Secciones del capítulo de Entrar.tsx.
function SiTodaviaNoEntraste() {
  return (
    <>
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
    </>
  );
}

export function SeccionCompuCelular() {
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
      <SiTodaviaNoEntraste />
    </>
  );
}

export function SeccionCompuGoogle() {
  return (
    <>
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
    </>
  );
}

export function SeccionCompuHuella() {
  return (
    <>
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
