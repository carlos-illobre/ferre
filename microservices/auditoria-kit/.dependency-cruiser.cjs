// El kit se lleva a cualquier servicio (specs/027, decisión 166): no importa nada de Ferrebress,
// solo su base (kysely, pg) y lo que trae Node.
module.exports = {
  forbidden: [
    {
      name: "solo-su-base-y-node",
      comment: "Ni Ferrebress ni otras bibliotecas que kysely y pg.",
      severity: "error",
      from: { path: "^src/", pathNot: "\\.test\\.ts$|^src/pruebas/" },
      to: { pathNot: "^src/|node_modules/(kysely|pg|pg-[a-z-]+|@types/pg)/|^node:" , dependencyTypesNot: ["core"] },
    },
  ],
  options: { tsPreCompilationDeps: true, tsConfig: { fileName: "tsconfig.json" }, doNotFollow: { path: "node_modules" } },
};
