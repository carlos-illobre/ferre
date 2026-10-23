// Variante A: tramos, como «Buscar versión nueva»; se guarda al tocar.
// Lo común a las dos variantes: la pantalla de Configuración pasa a ser Más → Sistema.
const celu = Boolean(document.querySelector(".encabezado"));
const main = document.querySelector("[data-testid=configuracion]");
main.querySelector("h1").textContent = "Sistema";
main.querySelector("header p").textContent = celu
  ? "Vale para todos los dispositivos. Lo cambia quien administra el sistema."
  : "Cómo se comporta el sistema en todos los dispositivos. Lo cambia solo quien tiene «Administrar el sistema»; nadie lo cambia para el suyo.";
main.querySelector(".cfg-propio")?.remove();
main.querySelector(".cfg-nota").textContent = celu
  ? "Vale para todos. Cada cambio queda en «Quién hizo qué»."
  : "Vale para todos los dispositivos y llega a los que están abiertos en menos de un minuto. Cada cambio queda en «Quién hizo qué».";
const T = {
  sesion: ["Cuánto recuerda la sesión el servidor",
    celu ? "Mientras la recuerda, no le pregunta a la base quién sos. Más tiempo, menos datos de la base."
         : "Mientras la recuerda, no le vuelve a preguntar a la base quién es cada persona ni qué puede hacer. Más tiempo gasta menos datos de la base. Lo que se cambia desde la aplicación (desactivar a alguien, sus permisos) vale en el momento; un cambio hecho directamente en la base tarda hasta este tiempo."],
  celular: ["Cada cuánto pregunta el celular emparejado",
    celu ? "Lo que pide la computadora llega al instante. Esto es el respaldo, por si se corta la conexión entre los dos."
         : "Lo que la computadora le pide al celular (una foto, que haga de lector) le llega al instante. Esta pregunta es el respaldo por si se corta la conexión entre los dos: más seguido se entera antes y gasta más datos de la base."],
  vinculo: ["Cuántos días dura el vínculo",
    celu ? "Cuánto dura el vínculo entre un celular y una computadora sin volver a vincularlos."
         : "Cuánto dura el vínculo entre un celular y una computadora sin volver a vincularlos. Los vínculos nuevos y los que se renuevan duran esto."],
};
const fila = (clave, control) => `<li class="cfg-fila cfg-sistema"><span class="cfg-nombre">${T[clave][0]}</span><span class="cfg-detalle">${T[clave][1]}</span>${control}</li>`;
const estilo = document.createElement("style");
estilo.textContent = `
.cfg-sistema { grid-template-columns: 1fr; }
.cfg-sistema .cfg-tramos { max-width: 560px; }
.cfg-numero { display: flex; align-items: center; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
.cfg-numero input { width: 88px; min-height: 44px; padding: 0 12px; border: 1.5px solid var(--p-borde, #c3cfc6); border-radius: 12px; font: inherit; font-size: 1.0625rem; font-weight: 700; text-align: center; background: var(--p-superficie, #fff); color: var(--p-tinta, #18201e); }
.cfg-numero .paso { width: 44px; min-height: 44px; border: 1.5px solid var(--p-borde, #c3cfc6); border-radius: 12px; background: var(--p-superficie, #fff); font: inherit; font-size: 1.25rem; font-weight: 700; color: var(--p-tinta, #18201e); }
.cfg-numero .unidad { font-weight: 600; color: var(--p-texto-2, #3a4441); }
.cfg-numero .rango { color: var(--p-texto-2, #4a5451); font-size: 0.9375rem; }
.cfg-numero select { min-height: 44px; padding: 0 10px; border: 1.5px solid var(--p-borde, #c3cfc6); border-radius: 12px; font: inherit; font-size: 1rem; font-weight: 600; background: var(--p-superficie, #fff); }
.cfg-guardar { display: flex; align-items: center; gap: 14px; margin-top: 16px; flex-wrap: wrap; }
.cfg-guardar button { min-height: 48px; padding: 0 22px; border: 0; border-radius: 12px; background: var(--p-ok, #0f8a5f); color: #fff; font: inherit; font-size: 1.0625rem; font-weight: 700; }
.cfg-guardar span { color: var(--p-texto-2, #4a5451); }
${celu ? ".cfg-guardar button { width: 100%; }" : ""}
`;
document.head.append(estilo);

const tramos = (lista, elegido) => `<div class="cfg-tramos" role="radiogroup" style="grid-template-columns: repeat(${lista.length}, 1fr)">${lista.map((t) => `<button type="button" role="radio" class="${t === elegido ? "elegido" : ""}">${t}</button>`).join("")}</div>`;
const dias = `<div class="cfg-numero"><button type="button" class="paso" aria-label="Un día menos">−</button><input inputmode="numeric" value="30" aria-label="Días"><button type="button" class="paso" aria-label="Un día más">+</button><span class="unidad">días</span><span class="rango">de 1 a 365</span></div>`;
main.querySelector(".cfg-lista").innerHTML =
  fila("sesion", tramos(["No", "30 s", "1 min", "5 min", "10 min"], "1 min")) +
  fila("celular", tramos(celu ? ["5 s", "30 s", "1 min", "5 min", "10 min"] : ["5 s", "15 s", "30 s", "1 min", "5 min", "10 min"], "1 min")) +
  fila("vinculo", dias);
