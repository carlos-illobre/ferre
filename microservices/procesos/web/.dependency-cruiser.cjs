// Procesos se lleva a otro proyecto (ADR-019): las pantallas no importan nada de fuera de su
// carpeta salvo los tipos del contrato de su propio servicio. Y el modelo (la regla del dibujo)
// no depende de React ni de bpmn-js, para poder probarlo sin navegador.
module.exports = {
  forbidden: [
    {
      name: "procesos-no-importa-nada-de-afuera",
      comment: "El módulo se tiene que poder copiar solo: nada de Ferrebress ni de otra carpeta del repositorio.",
      severity: "error",
      from: { path: "^src/", pathNot: "\\.test\\.tsx?$|^src/pruebas/" },
      to: { path: "^\\.\\./(?!servidor/src/contrato\\.ts$)", pathNot: "node_modules/" },
    },
    {
      name: "el-modelo-no-depende-de-pantallas-ni-de-bpmn-js",
      severity: "error",
      from: { path: "^src/modelo/" },
      to: { path: "^src/(compu|celu|editor)/|node_modules/(react|react-dom|bpmn-js|diagram-js)/" },
    },
  ],
  options: { tsPreCompilationDeps: true, tsConfig: { fileName: "tsconfig.json" }, doNotFollow: { path: "node_modules" } },
};
