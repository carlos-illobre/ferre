// Variante B: el vínculo va en la misma línea de estado que «En línea · todo enviado», como un
// renglón más, y el botón «Vincular» desaparece mientras están emparejados. Al tocar la línea se
// abre el detalle.
const celu = window.innerWidth < 900;
const ESTADO = window.__estado || "servidor";
const ABIERTO = window.__abierto !== false;
const e = window.__estados[ESTADO];
const enLinea = [...document.querySelectorAll("span, div, p, small")].filter((n) => /^\s*En línea/.test(n.textContent) && n.children.length < 4).pop();
const boton = [...document.querySelectorAll("button")].find((b) => ["Vincular", "Vincular el celular"].includes(b.textContent.trim()));
const fila = document.createElement("button");
fila.type = "button";
fila.style.cssText = celu
  ? "display:flex;align-items:center;gap:8px;margin-top:4px;padding:2px 0;min-height:32px;border:0;background:none;font:600 16px/1.3 inherit;font-family:inherit;color:#545955"
  : "display:flex;align-items:center;gap:8px;margin-top:8px;padding:6px 12px;min-height:36px;border:0;border-radius:999px;background:#ECE9E1;text-align:left;white-space:nowrap;width:max-content;font:600 15px/1.3 inherit;font-family:inherit;color:#1A1D1B";
fila.append(window.__punto(ESTADO), (celu ? (e.textoCelu || e.texto) + (ESTADO === "directa" || ESTADO === "servidor" ? " con la compu" : "") : (ESTADO === "directa" || ESTADO === "servidor" ? `Celular · ${e.texto.toLowerCase()}` : e.texto)) + " ›");
enLinea.after(fila);
if (boton) boton.style.visibility = "hidden";
if (ABIERTO) {
  const d = window.__detalle(celu);
  const velo = document.createElement("div"); velo.className = "cx-velo"; document.body.appendChild(velo);
  if (celu) {
    d.style.cssText = "left:0;right:0;bottom:0;border-radius:20px 20px 0 0;padding:22px 20px 28px";
    d.querySelectorAll("button").forEach((b) => { b.style.flex = "1 1 100%"; b.style.minHeight = "52px"; });
  } else {
    d.style.cssText = "left:50%;top:50%;transform:translate(-50%,-50%);width:460px";
  }
  document.body.appendChild(d);
}
