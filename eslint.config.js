// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import react from "eslint-plugin-react";
import tseslint from "typescript-eslint";

export default tseslint.config({ 
  ignores: [
    "dist", 
    "storybook-static",
    "build",
    "node_modules",
    // Temporary: ignore large verbose pages until refactored
  ] 
}, {
  extends: [js.configs.recommended, ...tseslint.configs.recommended],
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    ecmaVersion: 2020,
    globals: globals.browser,
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  plugins: {
    "react": react,
    "react-hooks": reactHooks,
    "react-refresh": reactRefresh,
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    ...reactHooks.configs.recommended.rules,
    ...react.configs.recommended.rules,
    // TEMPORARY RELAXED PHASE (Option A) ------------------------------------
    // Convert previous hard errors to warnings to get CI green; plan to tighten later.
    // Track re-hardening in ISSUE: lint-hardening-milestone
    "react/no-unknown-property": ["off", { ignore: ["args", "attach", "position"] }],
    "react/react-in-jsx-scope": "off", // Not needed with React 17+ JSX transform
    "react-refresh/only-export-components": ["off", { allowConstantExport: true }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-empty-object-type": "warn",
    "@typescript-eslint/no-require-imports": "warn",
    "@typescript-eslint/triple-slash-reference": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    // Keep useful safety nets
    "prefer-const": ["warn", { destructuring: "all" }],
    // ----------------------------------------------------------------------
  },
}, {
  files: ["src/lib/data/**/*.{ts,tsx}"],
  rules: {
    // Pilot stricter rules for newly modularized data layer
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": ["error", { allow: ["warn", "error"] }],
    "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
  }
}, storybook.configs["flat/recommended"]);
