// Lo común de las variantes: los estados con su color y el detalle que se abre al tocar el puntito.
// Uso: window.__estados, window.__detalle(variante) devuelve el nodo del detalle.
const ESTADOS = {
  directa: { color: "#1E9E62", texto: "Directa", hueco: false },
  servidor: { color: "#F0A20F", texto: "Por el servidor", hueco: false },
  conectando: { color: "#6B706B", texto: "Conectando…", hueco: true },
  solo: { color: "#CEC8BA", texto: "El celular no está abierto", textoCelu: "La compu no está abierta", hueco: true },
  pausa: { color: "#12382F", texto: "En pausa", hueco: true },
  sin: { color: "#D7372A", texto: "Sin conexión", hueco: false },
};
const estilos = document.createElement("style");
estilos.textContent = `
.cx-punto { flex: none; width: 12px; height: 12px; border-radius: 50%; box-sizing: border-box; }
.cx-det { position: fixed; z-index: 999; background: #fff; border: 1px solid #E6E2D8; border-radius: 16px; box-shadow: 0 12px 32px rgb(26 29 27 / .18); padding: 18px 20px; font: 500 16px/1.4 "Manrope Variable", Manrope, system-ui, sans-serif; color: #1A1D1B; }
.cx-det h3 { margin: 0 0 12px; font-size: 20px; font-weight: 750; display: flex; align-items: center; gap: 10px; }
.cx-det dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; }
.cx-det dt { color: #545955; font-size: 14px; font-weight: 650; }
.cx-det dd { margin: 0; font-size: 15px; }
.cx-det .cx-por { margin: 14px 0 0; padding: 10px 12px; border-radius: 10px; background: #FDF3DC; color: #7A5200; font-size: 15px; font-weight: 600; }
.cx-det .cx-botones { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
.cx-det button { min-height: 44px; padding: 0 16px; border-radius: 12px; font: 700 15px/1 inherit; font-family: inherit; cursor: pointer; }
.cx-det .cx-probar { background: #12382F; color: #fff; border: 0; }
.cx-det .cx-comun { background: #fff; color: #1A1D1B; border: 1.5px solid #CEC8BA; }
.cx-velo { position: fixed; inset: 0; background: rgb(26 29 27 / .35); z-index: 998; }
`;
document.head.appendChild(estilos);
window.__punto = (clave) => {
  const e = ESTADOS[clave];
  const p = document.createElement("span");
  p.className = "cx-punto";
  p.style.cssText = e.hueco ? `border: 2.5px solid ${e.color}` : `background: ${e.color}; box-shadow: 0 0 0 3px ${e.color}33`;
  return p;
};
window.__estados = ESTADOS;
window.__detalle = (celu) => {
  const d = document.createElement("div");
  d.className = "cx-det";
  d.setAttribute("role", "dialog");
  const otro = celu ? "la computadora" : "el celular";
  d.innerHTML = `<h3></h3>
    <dl>
      <dt>Con</dt><dd>${celu ? "Computadora del mostrador" : "Celular de Carlos (Pixel 8)"}</dd>
      <dt>Camino</dt><dd>Por el servidor de Ferrebress</dd>
      <dt>Demora</dt><dd>180 ms ida y vuelta</dd>
      <dt>Desde</dt><dd>Hoy, 9:42</dd>
    </dl>
    <p class="cx-por">${celu ? "El wifi no deja conectar directo con la compu." : "La red del local no deja conectar directo el celular y la computadora."} Se probó hoy a las 9:42.</p>
    <div class="cx-botones"><button class="cx-probar">Probar conexión directa</button><button class="cx-comun">Cerrar</button></div>`;
  const h = d.querySelector("h3");
  h.append(window.__punto("servidor"), `Por el servidor con ${otro}`);
  return d;
};
