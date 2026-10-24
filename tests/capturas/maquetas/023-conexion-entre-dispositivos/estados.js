// Los seis estados, uno debajo del otro, para ver los colores juntos (sobre la pantalla real).
const celu = window.innerWidth < 900;
const caja = document.createElement("div");
caja.style.cssText = "position:fixed;z-index:999;inset:" + (celu ? "120px 16px auto 16px" : "120px auto auto 400px") + ";background:#fff;border:1px solid #E6E2D8;border-radius:16px;padding:18px 20px;box-shadow:0 12px 32px rgb(26 29 27 / .18);font:500 16px/1.4 Manrope, system-ui;color:#1A1D1B;display:grid;gap:14px;" + (celu ? "" : "width:520px");
const t = document.createElement("strong"); t.textContent = "Los seis estados"; t.style.fontSize = "20px"; caja.append(t);
const notas = { directa: "Verde: anda directo, lo más rápido", servidor: "Ámbar: anda, por el servidor", conectando: "Gris hueco: buscando al otro", solo: "Gris claro hueco: el otro está cerrado", pausa: "Pino hueco: Desconectar", sin: "Rojo: sin internet y sin la directa" };
for (const k of Object.keys(window.__estados)) {
  const f = document.createElement("div"); f.style.cssText = "display:flex;align-items:center;gap:12px";
  const e = window.__estados[k];
  const tx = document.createElement("span"); tx.innerHTML = `<b>${celu ? e.textoCelu || e.texto : e.texto}</b><br><small style="color:#545955;font-size:14px">${notas[k]}</small>`;
  f.append(window.__punto(k), tx); caja.append(f);
}
const velo = document.createElement("div"); velo.className = "cx-velo"; document.body.append(velo, caja);
