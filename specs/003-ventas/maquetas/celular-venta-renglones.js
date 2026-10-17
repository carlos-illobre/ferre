(menu) => {
  const st = document.createElement("style");
  st.textContent = `
  .en-venta.mq{display:flex;align-items:center;gap:10px;white-space:nowrap;text-transform:none;letter-spacing:0;font-size:16px;font-weight:700;color:var(--p-tinta)}
  .en-venta.mq::before{display:none}
  .en-venta.mq .mq-vaciar{margin-left:auto;display:flex;align-items:center;gap:4px;color:var(--p-naranja-texto);font-size:14px;font-weight:600}
  .en-venta.mq span.mq-cuantos{font-size:14px;font-weight:500;color:var(--p-texto-2);margin:0}
  .item .cabeza.mq{grid-template-columns:52px minmax(0,1fr) auto 28px;padding:12px 12px 8px 12px;gap:2px 12px}
  .item .cabeza.mq .miniatura{width:52px;height:52px}
  .mq-unitario{grid-row:span 2;align-self:start;margin-top:2px;padding:5px 10px;border-radius:12px;background:var(--p-verde-suave);color:var(--p-verde);font-size:17px;font-weight:700;white-space:nowrap;text-align:right;line-height:1.15}.mq-unitario small{display:block;font-size:12px;font-weight:600;color:var(--p-verde-texto)}
  .mq-mas{grid-row:span 2;align-self:start;width:28px;height:36px;display:grid;place-items:center;color:var(--p-tinta);font-size:22px;font-weight:800;line-height:1}
  .item .pie.mq{display:grid;grid-template-columns:52px auto auto 1fr;gap:6px;padding:0 12px 12px;align-items:center}.item .pie.mq .unidad{display:none}.item .pie.mq .contador button{width:38px}.item .pie.mq .contador input{width:30px}.item .pie.mq .contador button{width:34px}.item .pie.mq .chip-margen{padding:0 8px}
  .item .pie.mq .quitar{width:52px;height:44px;border:1.5px solid var(--p-naranja-borde);background:#fff;color:var(--p-naranja-texto)}
  .mq-total{justify-self:end;font-size:18px;font-weight:800;color:var(--p-tinta);white-space:nowrap}
  .item{position:relative;overflow:visible}
  .mq-menu{position:absolute;right:12px;top:46px;z-index:5;min-width:230px;background:#fff;border-radius:14px;box-shadow:0 12px 32px rgb(23 49 43/.25);padding:6px 0}
  .mq-menu div{display:flex;align-items:center;gap:12px;padding:12px 16px;font-size:16px}
  .mq-menu div+div{border-top:1px solid var(--p-borde-suave)}
  .mq-menu svg{width:20px;height:20px;fill:none;stroke:var(--p-verde);stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}`;
  document.head.appendChild(st);
  const pesos = (n) => "$" + Math.round(n).toLocaleString("es-AR");
  const h = document.querySelector("[data-testid=titulo-venta]");
  const cuantos = h.querySelector("span").textContent;
  h.classList.add("mq");
  h.innerHTML = 'Productos en esta venta<span class="mq-vaciar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>Vaciar</span><span class="mq-cuantos">' + cuantos + "</span>";
  document.querySelectorAll("[data-testid=item]").forEach((it, i) => {
    const cabeza = it.querySelector(".cabeza"), pie = it.querySelector(".pie");
    const sub = cabeza.querySelector(".subtotal");
    const total = Number((sub?.textContent || "0").replace(/[^\d]/g, ""));
    const cantidad = Number(it.querySelector(".pie input")?.value || 1) || 1;
    cabeza.classList.add("mq");
    const pill = document.createElement("span"); pill.className = "mq-unitario"; const u = it.querySelector('.pie .unidad'); const un = u ? u.options[u.selectedIndex].text : 'un.'; pill.innerHTML = pesos(total / cantidad) + '<small>' + (un === 'un.' ? 'cada uno' : 'el ' + un) + '</small>';
    const mas = document.createElement("span"); mas.className = "mq-mas"; mas.textContent = "⋮";
    sub.replaceWith(pill); pill.after(mas);
    const det = cabeza.querySelector(".detalle"); cabeza.appendChild(det);
    pie.classList.add("mq");
    pie.prepend(pie.querySelector(".quitar"));
    const t = document.createElement("span"); t.className = "mq-total"; t.textContent = pesos(total); pie.appendChild(t);
    if (menu && i === 0) {
      const m = document.createElement("div"); m.className = "mq-menu";
      m.innerHTML = '<div><svg viewBox="0 0 24 24"><path d="M12 3v18M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6"/></svg>Precio a mano</div>'
        + '<div><svg viewBox="0 0 24 24"><path d="M3 7h18M3 12h18M3 17h10"/></svg>Vender por metro, kilo o unidad</div>' + '<div><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5"/></svg>Ver la ficha del producto</div>'
        + '<div><svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>Sacar foto</div>';
      it.appendChild(m);
    }
  });
}
