// Maqueta de Vender sin productos en el celular (003-T003), sobre la pantalla real:
// python tests/capturas/capturar.py vender --celu --py "page.evaluate(open('specs/003-ventas/maquetas/celular-venta-vacia.js').read())"
() => {
  const st = document.createElement("style");
  st.textContent = `
  .vacio.mq{margin-top:12px;gap:6px;padding:0}
  .vacio.mq .mq-dibujo{width:250px;height:178px;display:block}
  .vacio.mq strong{font-size:26px;font-weight:800;margin-top:4px;color:var(--p-tinta)}
  .vacio.mq p{font-size:16px;color:var(--p-texto-2);max-width:300px}
  .mq-como{margin-top:18px;width:100%;display:grid;grid-template-columns:repeat(3,1fr);background:var(--p-fondo-2);border:1px solid var(--p-borde-suave);border-radius:16px;padding:14px 4px}
  .mq-como div{display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 6px;text-align:center}
  .mq-como div+div{border-left:1px solid var(--p-borde-suave)}
  .mq-como svg{width:30px;height:30px;fill:none;stroke:var(--p-verde);stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;margin-bottom:4px}
  .mq-como b{font-size:16px;color:var(--p-tinta)}
  .mq-como span{font-size:14px;line-height:1.3;color:var(--p-texto-2)}`;
  document.head.appendChild(st);
  const v = document.querySelector(".vacio");
  v.classList.add("mq");
  v.querySelector(".icono").outerHTML = `
  <svg class="mq-dibujo" viewBox="0 0 250 178" aria-hidden="true">
    <path d="M18 160c4-34 26-58 56-62 8-34 40-58 78-56 42 2 66 30 70 66 14 6 22 26 22 52z" fill="#e3f3ea"/>
    <path d="M40 160c2-18 16-30 34-30 18 0 30 12 32 30z" fill="#d3e8dc"/>
    <path d="M168 160c2-26 12-44 28-44s24 18 24 44z" fill="#d3e8dc"/>
    <ellipse cx="128" cy="162" rx="106" ry="5" fill="#cfded4"/>
    <g stroke="#33574e" stroke-width="5" stroke-linecap="round"><path d="M112 14v16M90 20l8 12M134 20l-8 12"/></g>
    <g fill="none" stroke="#33574e" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M34 46h16l20 76h80"/>
      <path d="M54 62h112l-14 42H66"/>
    </g>
    <g fill="#fff" stroke="#33574e" stroke-width="6"><circle cx="76" cy="140" r="9"/><circle cx="140" cy="140" r="9"/></g>
    <rect x="160" y="96" width="48" height="58" rx="5" fill="#fff7d6" stroke="#33574e" stroke-width="3"/>
    <rect x="160" y="96" width="48" height="22" fill="#f7c445" opacity=".55"/>
    <ellipse cx="184" cy="96" rx="25" ry="7" fill="#c3cfc6" stroke="#33574e" stroke-width="3"/>
    <path d="M166 94c0-12 36-12 36 0" fill="none" stroke="#33574e" stroke-width="2.5"/>
    <circle cx="190" cy="128" r="11" fill="#0f6b52"/><rect x="185" y="124" width="10" height="7" rx="1.5" fill="#e3f3ea"/>
    <circle cx="224" cy="146" r="14" fill="#f7c445" stroke="#18201e" stroke-width="3"/>
    <circle cx="224" cy="146" r="5" fill="#18201e"/>
    <path d="M212 158h-14" stroke="#18201e" stroke-width="4" stroke-linecap="round"/>
    <g transform="translate(-112 6) rotate(-15 218 146)"><rect x="200" y="142" width="30" height="8" rx="2" fill="#a9b6ad"/>
      <path d="M204 142v8M209 142v8M214 142v8M219 142v8M224 142v8" stroke="#7c9085" stroke-width="1.5"/>
      <rect x="229" y="138" width="7" height="16" rx="2" fill="#7c9085"/></g>
  </svg>`;
  const como = document.createElement("div");
  como.className = "mq-como";
  como.innerHTML = `
    <div><svg viewBox="0 0 24 24"><path d="M4 5v14M7 5v14M10 5v14M14 5v14M17 5v14M20 5v14"/></svg><b>Escaneá</b><span>Con la cámara o el lector</span></div>
    <div><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><b>Buscá</b><span>Por nombre o código</span></div>
    <div><svg viewBox="0 0 24 24"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg><b>Explorá</b><span>En Catálogo, en el menú</span></div>`;
  v.appendChild(como);
}
