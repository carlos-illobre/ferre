// Auditoría no importa nada de otra carpeta del repositorio salvo el kit, que es un paquete (specs/027).
// Y las capas de siempre (ADR-025, 022-E11 022-E12): la ruta traduce, la regla decide y la capa de datos
// (`src/persistencia/`) lee y escribe; solo ella usa la base o el disco.
const PRUEBAS = "\\.test\\.ts$|^src/persistencia/pruebas/";
module.exports = {
  forbidden: [
    {
      name: "auditoria-no-importa-nada-de-afuera",
      comment: "Nada de los otros servicios: el contrato y el kit le alcanzan.",
      severity: "error",
      from: { path: "^src/" },
      to: { path: "^\\.\\./", pathNot: "node_modules/" },
    },
    {
      name: "solo-la-persistencia-usa-la-base-y-el-disco",
      severity: "error",
      from: { pathNot: `^src/persistencia/|${PRUEBAS}` },
      to: { path: "node_modules/(kysely|pg)/|^fs" },
    },
    {
      name: "la-ruta-no-habla-con-la-persistencia",
      severity: "error",
      from: { path: "^src/rutas\\.ts$" },
      to: { path: "^src/persistencia/" },
    },
    {
      name: "la-persistencia-no-depende-de-las-reglas-ni-de-las-rutas",
      severity: "error",
      from: { path: "^src/persistencia/", pathNot: PRUEBAS },
      to: { path: "^src/(rutas|reglas)\\.ts$" },
    },
  ],
  options: { tsPreCompilationDeps: true, tsConfig: { fileName: "tsconfig.pruebas.json" }, doNotFollow: { path: "node_modules" } },
};
