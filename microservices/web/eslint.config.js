// Los límites del front (ADR-028, decisión 155): complejidad y tamaño, los hooks bien usados y nada
// sin usar; no estilo.
// Lo que hoy no los cumple está en `limites-excepciones.json` y sale de ahí al ordenarlo.
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import unusedImports from "eslint-plugin-unused-imports";
import { readFileSync } from "node:fs";

const excepciones = JSON.parse(readFileSync(new URL("./limites-excepciones.json", import.meta.url), "utf8"));

const LIMITES = {
  complexity: ["error", 8],
  "max-depth": ["error", 3],
  "max-lines": ["error", { max: 150, skipBlankLines: true, skipComments: true }],
  "max-lines-per-function": ["error", { max: 40, skipBlankLines: true, skipComments: true }],
};

export default tseslint.config(
  { ignores: ["dist/**", "dist-*/**", "public/**", "node_modules/**"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}", "src/pruebas/**"],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    linterOptions: { reportUnusedDisableDirectives: "off" },
    plugins: { "react-hooks": reactHooks, "unused-imports": unusedImports },
    // Los hooks bien usados, que el código ya pedía con sus comentarios, y nada importado ni
    // declarado que no se use (lo importado de más se borra solo con --fix).
    rules: {
      ...LIMITES, "react-hooks/rules-of-hooks": "error", "react-hooks/exhaustive-deps": "warn",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": ["error", { args: "none", ignoreRestSiblings: true, caughtErrors: "none" }],
    },
  },
  ...(excepciones.length ? [{ files: excepciones, rules: Object.fromEntries(Object.keys(LIMITES).map((r) => [r, "off"])) }] : []),
);
