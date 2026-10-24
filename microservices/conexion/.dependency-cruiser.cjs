// El módulo se lleva a otro proyecto (ADR-027, RNF-68): no importa nada de fuera de su carpeta ni
// ninguna biblioteca. Lo del navegador y lo del servidor solo comparten `comun/`.
module.exports = {
  forbidden: [
    {
      name: "no-importa-nada-de-afuera",
      comment: "Ni Ferrebress ni bibliotecas: solo lo que trae el navegador o el servidor.",
      severity: "error",
      from: { path: "^src/", pathNot: "\\.test\\.ts$|^src/pruebas/" },
      to: { pathNot: "^src/" },
    },
    { name: "el-navegador-no-usa-el-servidor", severity: "error", from: { path: "^src/navegador/" }, to: { path: "^src/servidor/" } },
    { name: "el-servidor-no-usa-el-navegador", severity: "error", from: { path: "^src/servidor/" }, to: { path: "^src/navegador/" } },
  ],
  options: { tsPreCompilationDeps: true, tsConfig: { fileName: "tsconfig.json" }, doNotFollow: { path: "node_modules" } },
};
