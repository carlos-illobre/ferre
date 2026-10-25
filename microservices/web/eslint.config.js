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
  // Las teclas son solo del teclado (ADR-029): fuera de src/teclado/ nadie escucha teclas ni
  // pregunta cuál se apretó; las pantallas ofrecen acciones con nombre y el teclado las pide.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/teclado/**", "src/**/*.test.{ts,tsx}", "src/pruebas/**"],
    rules: {
      "no-restricted-syntax": ["error",
        { selector: "JSXAttribute[name.name=/^onKey(Down|Up|Press)$/]", message: "Las teclas van en src/teclado/ (ADR-029): ofrecé una acción con useComandos o useAccionesDelLugar." },
        { selector: "CallExpression[callee.property.name='addEventListener'][arguments.0.value=/^key(down|up|press)$/]", message: "Las teclas van en src/teclado/ (ADR-029)." },
        { selector: "MemberExpression[property.name=/^(key|code)$/][object.name=/^(e|ev|evento|event)$/]", message: "Las teclas van en src/teclado/ (ADR-029)." },
      ],
    },
  },
  // Lo guardado en el aparato y los pedidos al servidor son de datos/ (y de la técnica de la
  // plataforma): el negocio y las pantallas los usan por datos/, nunca directo (ADR-028).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/datos/**", "src/plataforma/**", "src/app/**", "src/**/*.test.{ts,tsx}", "src/pruebas/**"],
    rules: {
      "no-restricted-globals": ["error",
        { name: "localStorage", message: "Lo guardado va por datos/almacenamiento (ADR-028)." },
        { name: "sessionStorage", message: "Lo guardado va por datos/almacenamiento (ADR-028)." },
        { name: "indexedDB", message: "Lo guardado va por datos/almacenamiento (ADR-028)." },
        { name: "fetch", message: "Los pedidos al servidor van por datos/conexion (ADR-028)." },
      ],
    },
  },
  ...(excepciones.length ? [{ files: excepciones, rules: Object.fromEntries(Object.keys(LIMITES).map((r) => [r, "off"])) }] : []),
);
