// Maqueta del éxito de la venta en el celular (003-T004), sobre la pantalla real. Se corre dos
// veces: «antes» de cobrar guarda los renglones; «despues» rearma el éxito con ellos.
// python tests/capturas/capturar.py vender --celu --py "b=page.get_by_test_id('busqueda'); b.fill('cable'); b.press('Enter'); b.fill('candado'); b.press('Enter')" \
//   --py "js=open('specs/003-ventas/maquetas/celular-venta-registrada.js').read(); page.evaluate(js, 'antes'); page.get_by_test_id('cobrar').click(); page.wait_for_timeout(800); page.evaluate(js, 'despues')"
(modo) => {
  if (modo === "antes") {
    window.__renglones = [...document.querySelectorAll("[data-testid=item]")].map((it) => ({
      nombre: it.querySelector(".nombre")?.textContent ?? "",
      detalle: (it.querySelector(".cabeza .detalle")?.textContent ?? "").replace(/\s*·\s*stock.*$/, ""),
      cantidad: it.querySelector("[data-testid=cantidad]")?.value ?? "1",
      unidad: it.querySelector(".unitario small")?.textContent ?? "",
      total: it.querySelector("[data-testid=subtotal]")?.textContent ?? "",
      foto: it.querySelector(".miniatura img")?.src ?? null,
    }));
    return;
  }
  const st = document.createElement("style");
  st.textContent = `
  .exito.mq{background:var(--p-fondo);color:var(--p-tinta);justify-content:flex-start;align-items:stretch;gap:12px;padding:48px 16px 104px;overflow:auto;text-align:left}
  .mq .mq-tilde{align-self:center;width:84px;height:84px;border-radius:50%;background:var(--p-ok);color:#fff;display:grid;place-items:center;box-shadow:0 8px 20px rgb(15 138 95/.3)}
  .mq h1{margin:6px 0 4px;text-align:center;font-size:28px;font-weight:800;color:var(--p-tinta)}
  .mq .mq-cobrado{background:var(--p-verde-suave);border:1px solid #cfe6d8;border-radius:18px;padding:16px 14px 12px;text-align:center}
  .mq .mq-cobrado small{display:block;font-size:15px;font-weight:600;color:var(--p-texto-medio)}
  .mq .mq-cobrado .mq-importe{font-size:52px;font-weight:800;line-height:1.05;letter-spacing:-1px;color:var(--p-tinta);margin:2px 0}
  .mq .mq-medio{display:flex;justify-content:center;align-items:center;gap:8px;font-size:17px;font-weight:600}
  .mq .mq-stock{margin-top:12px;display:flex;align-items:center;gap:10px;background:rgb(255 255 255/.6);border-radius:12px;padding:10px 12px;font-size:15px;font-weight:600;color:var(--p-verde-texto)}
  .mq .mq-stock .mq-ok{margin-left:auto}
  .mq .mq-datos{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .mq .mq-dato,.mq .mq-vendidos{background:#fff;border:1px solid var(--p-borde);border-radius:16px;padding:12px 14px}
  .mq .mq-dato{display:grid;grid-template-columns:28px 1fr;gap:2px 10px;align-items:center}
  .mq .mq-dato svg{grid-row:span 2;color:var(--p-verde)}
  .mq .mq-dato small{font-size:14px;color:var(--p-texto-2)}
  .mq .mq-dato b{font-size:16px}
  .mq .mq-vendidos h2{margin:0 0 6px;font-size:17px;font-weight:800}
  .mq .mq-renglon{display:grid;grid-template-columns:44px minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:8px 0}
  .mq .mq-renglon+.mq-renglon{border-top:1px solid var(--p-borde-suave)}
  .mq .mq-foto{width:44px;height:44px;border-radius:10px;background:var(--p-relleno);overflow:hidden}.mq .mq-foto img{width:100%;height:100%;object-fit:cover}
  .mq .mq-renglon b{display:block;font-size:15px;font-weight:600;line-height:1.25}
  .mq .mq-renglon span small{display:block;font-size:14px;color:var(--p-texto-2)}
  .mq .mq-cant{font-size:15px;color:var(--p-texto-2);white-space:nowrap}
  .mq .mq-total{font-size:16px;font-weight:800;white-space:nowrap}
  .mq .mq-nueva{position:fixed;left:16px;right:16px;bottom:20px;height:56px;border:0;border-radius:16px;background:var(--p-verde);color:#fff;font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:10px}`;
  document.head.appendChild(st);
  const svg = (d, t = 22) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const ex = document.querySelector("[data-testid=exito]");
  const importe = ex.querySelector(".importe").textContent;
  const medio = ex.querySelector(".medio").textContent;
  const hora = (ex.querySelector(".detalle").textContent.match(/\d\d:\d\d/) || [""])[0];
  const hoy = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const r = window.__renglones || [];
  const cant = (x) => x.unidad === "cada uno" ? `${x.cantidad} un.` : `${x.cantidad} ${x.unidad.replace(/^el /, "")}`;
  ex.classList.add("mq");
  ex.innerHTML = `
    <div class="mq-tilde">${svg("M5 12.5l4.5 4.5L19 7", 44)}</div>
    <h1>¡Venta registrada!</h1>
    <section class="mq-cobrado">
      <small>Total cobrado</small>
      <div class="mq-importe">${importe}</div>
      <div class="mq-medio">${svg("M3 7h18v10H3zM12 12m-2.2 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0M6 10v4M18 10v4", 22)}${medio}</div>
      <div class="mq-stock">${svg("M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9", 22)}El stock ya se descontó<span class="mq-ok">${svg("M5 12.5l4.5 4.5L19 7", 22)}</span></div>
    </section>
    <div class="mq-datos">
      <div class="mq-dato">${svg("M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", 24)}<small>Fecha y hora</small><b>${hoy} ${hora}</b></div>
      <div class="mq-dato">${svg("M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0", 24)}<small>Productos</small><b>${r.length}</b></div>
    </div>
    <section class="mq-vendidos">
      <h2>Productos vendidos</h2>
      ${r.map((x) => `<div class="mq-renglon"><span class="mq-foto">${x.foto ? `<img src="${x.foto}" alt="">` : ""}</span><span><b>${x.nombre}</b><small>${x.detalle}</small></span><span class="mq-cant">${cant(x)}</span><span class="mq-total">${x.total}</span></div>`).join("")}
    </section>
    <button type="button" class="mq-nueva">${svg("M12 5v14M5 12h14", 22)}Nueva venta</button>`;
}
