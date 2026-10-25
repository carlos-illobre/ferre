import { useEffect, useState } from "react";
import { useRecordado } from "../../../../negocio/configuracion";
import { irA } from "../rutas";
import { Logotipo } from "../../../Logotipo";
import type { Dispositivo } from "./manual/piezas";
import { CAPITULOS, escritoPara, seccionesDe } from "./manual/capitulos";
import { Buscador } from "./manual/Buscador";
import { IndiceDelManual } from "./manual/Indice";
import { Lectura } from "./manual/Lectura";
import { Derecha } from "./manual/Derecha";
import "../estilos/manual.css";

export { CAPITULOS } from "./manual/capitulos";

// El manual de uso (RF-97, specs/012-manual-de-uso): lo abre «Ver tutorial» en la entrada de la
// computadora, sin sesión y en la misma pestaña. Un capítulo por pantalla principal; los que faltan
// escribir dicen «pronto». El marco copia maquetas/manual-marco.html; arriba del índice se elige
// el dispositivo (maquetas/manual-dispositivo.html, decisión 109) y el manual muestra solo lo
// suyo. Cada capítulo está en manual/; las capturas y los clips, en public/manual/<capítulo>/, los
// arma tests/capturas/tutorial/ con la aplicación de verdad y no se guardan para usar sin conexión.
// La sección que se lee: la última cuyo título ya pasó por debajo de la barra de arriba.
function useSeccionQueSeLee(ids: string[]): string {
  const [actual, setActual] = useState(ids[0] ?? "");
  const clave = ids.join(" ");
  useEffect(() => {
    const lista = clave.split(" ");
    const mirar = () => {
      let leida = lista[0] ?? "";
      for (const id of lista) { const t = document.getElementById(id); if (t && t.getBoundingClientRect().top < 160) leida = id; }
      setActual(leida);
    };
    mirar();
    window.addEventListener("scroll", mirar, { passive: true });
    return () => window.removeEventListener("scroll", mirar);
  }, [clave]);
  return actual;
}

// El capítulo abierto y el dispositivo elegido. Si el capítulo abierto no está escrito para el
// dispositivo, se abre el primero que sí.
function useManual() {
  // El dispositivo elegido se recuerda en esa computadora; si no se puede guardar, abre en Computadora.
  const [dispositivo, guardarDispositivo] = useRecordado<Dispositivo>("ferre.manual-dispositivo", ["compu", "celu"]);
  const [elegido, setElegido] = useState(0);
  const numero = escritoPara(CAPITULOS[elegido]!, dispositivo) ? elegido : Math.max(0, CAPITULOS.findIndex((c) => escritoPara(c, dispositivo)));
  const secciones = seccionesDe(CAPITULOS[numero]!, dispositivo);
  const actual = useSeccionQueSeLee(secciones.map((x) => x.id));
  const escritos = CAPITULOS.map((c, i) => ({ c, i })).filter(({ c }) => escritoPara(c, dispositivo));
  function elegirDispositivo(d: Dispositivo) {
    guardarDispositivo(d);
    window.scrollTo({ top: 0 });
  }
  function abrirCapitulo(i: number) {
    setElegido(i);
    window.scrollTo({ top: 0 });
    document.getElementById("contenido")?.focus({ preventScroll: true });
  }
  return { dispositivo, numero, secciones, actual, escritos, setElegido, elegirDispositivo, abrirCapitulo };
}

export function Manual() {
  const m = useManual();
  const contenido = CAPITULOS[m.numero]!.escrito![m.dispositivo]!;
  return (
    <div className="manual" data-testid="manual" data-dispositivo={m.dispositivo}>
      <header className="manual-barra">
        <span className="manual-logo"><Logotipo sobre="oscuro" /></span>
        <span className="manual-titulo"><strong>Manual de uso</strong><small>Aprendé a tu ritmo, sin complicaciones</small></span>
        <Buscador alAbrirCapitulo={m.setElegido} />
        <button type="button" className="manual-volver" onClick={() => irA("")} data-testid="manual-volver">← Volver a Ferrebress</button>
      </header>
      <div className="manual-marco">
        <IndiceDelManual x={m} alElegirDispositivo={m.elegirDispositivo} />
        <Lectura x={m} />
        <Derecha consejo={contenido.consejo} relacionados={contenido.relacionados} />
      </div>
    </div>
  );
}
