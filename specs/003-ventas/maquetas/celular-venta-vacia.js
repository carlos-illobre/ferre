// Maqueta de Vender sin productos en el celular (003-T003), sobre la pantalla real:
// python tests/capturas/capturar.py vender --celu --py "page.evaluate(open('specs/003-ventas/maquetas/celular-venta-vacia.js').read())"
() => {
  const st = document.createElement("style");
  st.textContent = `
  .vacio.mq{margin-top:12px;gap:6px;padding:0}
  .vacio.mq .mq-dibujo{width:260px;height:auto;display:block}
  .vacio.mq strong{font-size:26px;font-weight:800;margin-top:4px;color:var(--p-tinta)}
  .vacio.mq p{font-size:16px;color:var(--p-texto-2);max-width:300px}
  .mq-como{margin-top:18px;width:100%;display:grid;grid-template-columns:repeat(3,1fr);background:var(--p-verde-suave);border:1px solid #cfe6d8;border-radius:16px;padding:14px 4px}
  .mq-como div{display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 6px;text-align:center}
  .mq-como div+div{border-left:1px solid #cfe6d8}
  .mq-como svg{width:30px;height:30px;fill:none;stroke:var(--p-verde);stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;margin-bottom:4px}
  .mq-como b{font-size:16px;color:var(--p-tinta)}
  .mq-como span{font-size:14px;line-height:1.3;color:var(--p-texto-2)}`;
  document.head.appendChild(st);
  const v = document.querySelector(".vacio");
  v.classList.add("mq");
  v.querySelector(".icono").outerHTML = `<img class="mq-dibujo" src="/ilustraciones/venta-nueva.png" alt="">`;
  const como = document.createElement("div");
  como.className = "mq-como";
  como.innerHTML = `
    <div><svg viewBox="0 0 24 24"><path d="M4 5v14M7 5v14M10 5v14M14 5v14M17 5v14M20 5v14"/></svg><b>Escaneá</b><span>Con la cámara o el lector</span></div>
    <div><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><b>Buscá</b><span>Por nombre o código</span></div>
    <div><svg viewBox="0 0 24 24"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg><b>Explorá</b><span>En Catálogo, en el menú</span></div>`;
  v.appendChild(como);
}
