// ESLint flat config: minimal, permissive, TypeScript-aware
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  // Ignore common build/output dirs only
  {
    ignores: [
      "dist",
      "build",
      "storybook-static",
      "node_modules",
      "**/*.d.ts"
    ]
  },
  // Apply recommended rules for JS/TS (no stylistic/strict rules)
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"]
  }
];
