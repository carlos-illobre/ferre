// Variante A: el vínculo tiene su propio botón, donde hoy está «Vincular»: el puntito, el texto
// corto y con quién. Al tocarlo se abre el detalle.
const celu = window.innerWidth < 900;
const ESTADO = window.__estado || "servidor";
const ABIERTO = window.__abierto !== false;
const e = window.__estados[ESTADO];
const boton = [...document.querySelectorAll("button")].find((b) => ["Vincular", "Vincular el celular"].includes(b.textContent.trim()));
const nuevo = document.createElement("button");
nuevo.type = "button";
nuevo.style.cssText = celu
  ? "display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border-radius:999px;border:1.5px solid #CEC8BA;background:#fff;font:700 15px/1.2 inherit;font-family:inherit;color:#1A1D1B;white-space:nowrap"
  : "display:flex;align-items:center;gap:12px;width:100%;min-height:56px;padding:8px 14px;border-radius:12px;border:1.5px solid #CEC8BA;background:#fff;font-family:inherit;color:#1A1D1B;text-align:left";
const texto = document.createElement("span");
texto.innerHTML = celu
  ? `${e.textoCelu || e.texto}`
  : `<b style="display:block;font-size:16px;font-weight:700">${e.texto}</b><small style="font-size:14px;color:#545955;font-weight:500">Celular de Carlos</small>`;
nuevo.append(window.__punto(ESTADO), texto);
nuevo.className = boton.className; boton.style.display = "none"; boton.after(nuevo);
if (ABIERTO) {
  const d = window.__detalle(celu);
  if (celu) {
    const velo = document.createElement("div"); velo.className = "cx-velo"; document.body.appendChild(velo);
    d.style.cssText = "left:0;right:0;bottom:0;border-radius:20px 20px 0 0;padding:22px 20px 28px";
    d.querySelectorAll("button").forEach((b) => { b.style.flex = "1 1 100%"; b.style.minHeight = "52px"; });
  } else {
    const r = nuevo.getBoundingClientRect();
    d.style.cssText = `left:${r.left}px;bottom:${innerHeight - r.top + 10}px;width:420px`;
  }
  document.body.appendChild(d);
}
