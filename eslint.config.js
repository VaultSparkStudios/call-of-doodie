import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import reactPlugin from "eslint-plugin-react";

export default [
  { ignores: ["dist", "node_modules"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "react": reactPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react/jsx-uses-vars": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-undef": "off", // game uses many canvas/browser globals; enable when TS is added
      "no-constant-condition": "warn",
      "no-duplicate-case": "error",
      "no-unreachable": "warn",
    },
  },
  // S174: Vite module entries are the HMR root, not hot-refreshed components, and
  // correctly export nothing. eslint-plugin-react-refresh 0.5.6 (Dependabot #151,
  // 78efba4) extended only-export-components to flag a file with NO exports, which
  // turned the unchanged entry into a warning and took `lint:strict` red. Scope the
  // rule off for entries rather than raising --max-warnings: the budget is not the
  // thing that moved. src/entryFiles.test.js keeps this list matched to index.html.
  {
    files: ["src/main.jsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
];
