import { Hono } from "hono";
import { exigirSesion, puede } from "../autenticacion.js";
import * as reglas from "../productos/reglas.js";
import { cambiosDeProducto } from "../productos/esquemas.js";
import { leerCuerpo } from "../validar.js";

export { conPrecio, normalizarBusqueda, type ProductoCatalogo } from "../productos/reglas.js";

// El catálogo para el mostrador (issues #13 y #14). La ruta solo traduce (ADR-018); las reglas
// y los datos están en `productos/`.
export const productos = new Hono();
productos.use("/*", exigirSesion);

// Desde la copia del catálogo en el servidor (specs/018): ninguna lee productos de la base.
productos.get("/", (c) => {
  const { limite, desde, buscar, codigo, ids } = c.req.query();
  return c.json(reglas.catalogo({ limite, desde, buscar, codigo, ids }));
});
productos.get("/pagina", async (c) => {
  const { limite, desde, buscar, codigo, ids, marca, disponibilidad } = c.req.query();
  return c.json(await reglas.pagina({ limite, desde, buscar, codigo, ids, marca, disponibilidad }));
});
productos.get("/descarga", (c) => { const { marca, desde, limite } = c.req.query(); return c.json(reglas.descarga({ marca, desde, limite })); });
productos.get("/resumen", (c) => c.json(reglas.resumen()));
productos.get("/marcas", (c) => c.json(reglas.marcas({ buscar: c.req.query("buscar") })));

productos.patch("/:id", async (c) => {
  const cuerpo = await leerCuerpo(c, cambiosDeProducto);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  const usuario = c.get("sesion").usuario;
  const r = await reglas.cambiar(c.req.param("id"), cuerpo.datos, puede(usuario, "catalogo.margenes"), usuario.id);
  return r ? c.json({ error: r.error, ...(r.permiso ? { permiso: r.permiso } : {}) }, r.estado) : c.body(null, 204);
});

productos.post("/:id/foto", async (c) => {
  const r = await reglas.subirFoto(c.req.param("id"), (await c.req.parseBody())["foto"], c.get("sesion").usuario.id);
  return "error" in r ? c.json({ error: r.error }, r.estado) : c.json(r);
});

// Las fotos se sirven sin sesión (ver `productos/reglas.ts`).
export const fotos = new Hono();
fotos.get("/:nombre", async (c) => {
  const f = await reglas.foto(c.req.param("nombre"));
  return f ? c.body(f.contenido, 200, { "Content-Type": f.tipo, "Cache-Control": "public, max-age=31536000, immutable" }) : c.json({ error: "No existe esa foto" }, 404);
});
