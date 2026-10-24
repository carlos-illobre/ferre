// Más, con «Sistema» después de Configuración: solo la ve quien tiene «Administrar el sistema».
const boton = document.querySelector("[data-testid=mas-configuracion]");
const celu = !boton.classList.contains("mas-tarjeta");
const original = celu ? boton : boton.closest("li");
const nueva = original.cloneNode(true);
const b = celu ? nueva : nueva.querySelector("button");
b.dataset.testid = "mas-sistema";
const hojas = [...b.querySelectorAll("*")].filter((e) => e.children.length === 0 && e.textContent.trim() && e.tagName !== "path");
hojas[0].textContent = "Sistema";
hojas[1].textContent = celu ? "Lo que vale para todos los dispositivos" : "Lo que vale para todos los dispositivos: la sesión, el celular emparejado y el vínculo";
b.querySelector(".tecla")?.remove();
const icono = b.querySelector("svg");
if (icono) icono.outerHTML = `<svg viewBox="0 0 24 24" width="${icono.getAttribute("width") ?? 24}" height="${icono.getAttribute("height") ?? 24}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>`;
original.after(nueva);
