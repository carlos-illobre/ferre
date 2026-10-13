// Las capas del front (ADR-018). `plataforma/` es tecnología reutilizable en cualquier
// aplicación: no puede depender del negocio ni de las pantallas. Corre en cada subida.
module.exports = {
  forbidden: [
    {
      name: "la-plataforma-no-depende-del-negocio",
      comment: "Lo que está en src/plataforma se tiene que poder copiar a otro proyecto: no importa nada de fuera de esa carpeta (salvo librerías).",
      severity: "error",
      from: { path: "^src/plataforma/", pathNot: "\\.test\\.tsx?$" },
      to: { path: "^src/", pathNot: "^src/plataforma/" },
    },
    {
      name: "las-pruebas-de-la-plataforma-tampoco",
      severity: "error",
      from: { path: "^src/plataforma/.*\\.test\\.tsx?$" },
      to: { path: "^src/", pathNot: "^src/(plataforma|pruebas)/" },
    },
  ],
  options: { tsPreCompilationDeps: true, tsConfig: { fileName: "tsconfig.json" }, doNotFollow: { path: "node_modules" } },
};
