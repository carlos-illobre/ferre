// Navegación entre maquetas. Cada maqueta lo carga con <script src="…/_comun/navegar.js" defer>.
//
// - Un elemento con data-ir="<pantalla>" lleva a esa pantalla, en la misma versión y el mismo
//   dispositivo. Las pantallas son las carpetas: entrar, vender, ventas-de-hoy, productos, listas,
//   duplicados, stock, compras, contar, resumen, usuarios, actividad, anomalias, procesos,
//   mejoras-y-errores, configuracion.
// - Si una maqueta no marcó su menú, se conectan solos los elementos cuyo texto es el nombre de
//   una pantalla o de una parte del menú (Vender, Catálogo, Stock…). Si la maqueta marcó al menos
//   un data-ir, no se conecta nada solo.
// - Dentro del navegador de versiones (/v2, /v3, /v4) cambia la pantalla del marco; abierta sola,
//   va al navegador de su versión.
(function () {
  var NOMBRES = {
    "entrar": "entrar", "salir": "entrar", "cerrar sesión": "entrar",
    "vender": "vender",
    "ventas de hoy": "ventas-de-hoy",
    "catálogo": "productos", "productos": "productos",
    "listas de precios": "listas", "listas": "listas",
    "duplicados": "duplicados",
    "depósito": "stock", "stock": "stock",
    "compras": "compras",
    "contar": "contar", "estanterías": "contar",
    "negocio": "resumen", "resumen": "resumen", "cómo va el negocio": "resumen",
    "usuarios": "usuarios",
    "quién hizo qué": "actividad", "actividad": "actividad",
    "más": "anomalias", "anomalías": "anomalias",
    "procesos": "procesos",
    "mejoras y errores": "mejoras-y-errores", "mejoras": "mejoras-y-errores",
    "configuración": "configuracion", "ajustes": "configuracion",
  };

  var partes = location.pathname.split("/");
  var i = partes.lastIndexOf("maquetas");
  var aqui = i >= 0 ? partes[i + 1] : "";
  var variante = (location.pathname.match(/variante-(\d+)/) || [, "1"])[1];
  var version = "v" + (Math.min(Number(variante), 3) + 1);
  var dispositivo = location.pathname.indexOf("/celu/") >= 0 ? "celu" : "compu";

  function ir(destino) {
    if (!destino || destino === aqui) return;
    var hash = "#" + destino + "/" + dispositivo;
    if (window.parent !== window) {
      try { window.parent.postMessage({ maqueta: "ir", pantalla: destino }, "*"); return; } catch (e) { /* sigue abajo */ }
    }
    var base = i >= 0 ? partes.slice(0, i).join("/") : "..";
    location.href = base + "/" + version + "/" + hash;
  }
  window.irAMaqueta = ir;

  function texto(el) { return (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase(); }

  // Solo si la maqueta no marcó nada: así una pestaña propia que se llama igual que una pantalla
  // («Compras» dentro de Resumen) no se va a otra parte. data-no-ir la excluye igual.
  function conectarSolos() {
    if (document.querySelector("[data-ir]")) return;
    var candidatos = document.querySelectorAll("nav a, nav button, aside a, aside button, [role=tab], .menu a, .menu button, .pestanas a, .pestanas button, .pestana, .tabs a, .tabs button, footer nav *");
    Array.prototype.forEach.call(candidatos, function (el) {
      if (el.closest("[data-ir], [data-no-ir]")) return;
      var t = texto(el).replace(/\s*\d+$/, "");
      if (NOMBRES[t]) el.setAttribute("data-ir", NOMBRES[t]);
    });
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-ir]");
    if (!el) return;
    e.preventDefault();
    ir(el.getAttribute("data-ir"));
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", conectarSolos);
  else conectarSolos();
})();
