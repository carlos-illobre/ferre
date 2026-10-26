// 022-E11 022-E12: las capas del servidor (ADR-018, ADR-025): la ruta traduce el pedido, las reglas deciden y la
// capa de datos (`src/persistencia/`) lee y escribe. Solo la capa de datos usa la base o el disco;
// una ruta no habla con ella; y ella no depende de las reglas ni de las rutas. Corre en cada subida.
const PRUEBAS = "\\.test\\.ts$|^src/pruebas/|^src/persistencia/pruebas/";
module.exports = {
  forbidden: [
    {
      name: "solo-la-persistencia-usa-la-base",
      comment: "La base (kysely, pg) solo se usa desde src/persistencia/.",
      severity: "error",
      from: { pathNot: `^src/persistencia/|${PRUEBAS}` },
      to: { path: "node_modules/(kysely|pg)/" },
    },
    {
      name: "solo-la-persistencia-usa-el-disco",
      comment: "Los archivos (node:fs) solo se leen y escriben desde src/persistencia/.",
      severity: "error",
      from: { pathNot: `^src/persistencia/|${PRUEBAS}` },
      to: { dependencyTypes: ["core"], path: "^fs" },
    },
    {
      name: "la-ruta-no-habla-con-la-persistencia",
      comment: "Una ruta (src/rutas) solo llama a reglas.",
      severity: "error",
      from: { path: "^src/rutas/", pathNot: PRUEBAS },
      to: { path: "^src/persistencia/" },
    },
    {
      name: "la-persistencia-no-depende-del-negocio",
      comment: "La capa de datos solo usa la configuración, los contratos y los permisos, nunca reglas ni rutas.",
      severity: "error",
      from: { path: "^src/persistencia/", pathNot: PRUEBAS },
      to: { path: "^src/", pathNot: "^src/(persistencia|contratos)/|^src/(config|enviable|permisos)\\.ts$" },
    },
  ],
  options: { tsPreCompilationDeps: true, tsConfig: { fileName: "tsconfig.json" }, doNotFollow: { path: "node_modules" } },
};
