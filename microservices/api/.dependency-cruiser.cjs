// Las capas del servidor (ADR-018): la ruta traduce el pedido, las reglas deciden y los datos
// leen y escriben. Una ruta no habla con la base ni con la capa de datos; las reglas sí.
// Corre en cada subida.
module.exports = {
  forbidden: [
    {
      name: "la-ruta-no-habla-con-la-base",
      comment: "Una ruta (src/rutas) solo llama a reglas: el SQL va en <tema>/datos.ts.",
      severity: "error",
      from: { path: "^src/rutas/", pathNot: "\\.test\\.ts$" },
      to: { path: "^src/(db|base)\\.ts$|^src/[^/]+/datos\\.ts$|^src/acceso/(sesiones|vinculo)\\.ts$" },
    },
    {
      name: "los-datos-no-dependen-de-las-reglas-ni-de-las-rutas",
      severity: "error",
      from: { path: "^src/[^/]+/datos\\.ts$" },
      to: { path: "^src/rutas/|^src/[^/]+/reglas\\.ts$" },
    },
  ],
  options: { tsPreCompilationDeps: true, tsConfig: { fileName: "tsconfig.json" }, doNotFollow: { path: "node_modules" } },
};
