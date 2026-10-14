// Procesos se lleva a otro proyecto (ADR-019): no puede importar nada de fuera de su carpeta.
// Y las capas de siempre: la ruta traduce, la regla decide y los datos leen y escriben.
module.exports = {
  forbidden: [
    {
      name: "procesos-no-importa-nada-de-afuera",
      comment: "El módulo se tiene que poder copiar solo: nada de Ferrebress ni de otra carpeta del repositorio.",
      severity: "error",
      from: { path: "^src/" },
      to: { path: "^\\.\\./", pathNot: "node_modules/" },
    },
    {
      name: "la-ruta-no-habla-con-la-base",
      severity: "error",
      from: { path: "^src/rutas\\.ts$" },
      to: { path: "^src/(datos|migraciones)\\.ts$" },
    },
    {
      name: "los-datos-no-dependen-de-las-reglas-ni-de-las-rutas",
      severity: "error",
      from: { path: "^src/(datos|memoria)\\.ts$" },
      to: { path: "^src/(rutas|reglas)\\.ts$" },
    },
  ],
  options: { tsPreCompilationDeps: true, tsConfig: { fileName: "tsconfig.pruebas.json" }, doNotFollow: { path: "node_modules" } },
};
