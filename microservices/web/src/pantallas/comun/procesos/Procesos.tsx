import { lazy, Suspense } from "react";
import { dondeGuardarProcesos, PANTALLAS_DE_FERREBRESS, pedirAProcesos } from "../../../negocio/procesos";
import { usePuede } from "../../permisos";
import "./procesos.css";

// Procesos (RF-90 a RF-95) es un módulo aparte que se lleva a otros proyectos (ADR-019). Acá
// Ferrebress le da lo que necesita: cómo pedir al servidor, qué puede quien lo usa, sus
// pantallas y dónde guardar (en negocio/procesos). El módulo, con bpmn-js adentro, se baja solo al entrar.
const Modulo = lazy(async () => {
  const [m] = await Promise.all([import("procesos-web"), import("procesos-web/estilos.css")]);
  return { default: m.Procesos };
});

export function PantallaDeProcesos({ interfaz }: { interfaz: "compu" | "celu" }) {
  const puede = usePuede();
  // En la computadora es una página más; en el celular, el contenido de Más.
  return (
    <main id={interfaz === "compu" ? "contenido" : undefined} className={`${interfaz === "compu" ? "pagina" : "contenido"} procesos-en-ferrebress`} tabIndex={-1}>
    <Suspense fallback={<p className="detalle" role="status" style={{ padding: 16 }}>Abriendo Procesos…</p>}>
      <Modulo
        interfaz={interfaz}
        pedir={pedirAProcesos}
        puede={{ ver: puede("procesos.ver", "procesos.dibujar"), dibujar: puede("procesos.dibujar") }}
        pantallas={PANTALLAS_DE_FERREBRESS}
        guardarLocal={dondeGuardarProcesos()}
        donde={["Más"]}
      />
    </Suspense>
    </main>
  );
}

export { pedirAProcesos };
