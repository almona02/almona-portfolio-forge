// ESLint flat config: parse TS in src/, no rules
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "dist",
      "build",
      "storybook-static",
      "node_modules",
      "**/*.d.ts",
      "**/*.cjs",
      "**/*.mjs",
      "scripts/**",
      "docs/**",
      "sdk/**"
    ]
  },
  {
    files: ["src/**/*.{ts,tsx}", "src/**/*.js"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        module: "readonly",
        require: "readonly",
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly"
      }
    },
    rules: {}
  }
];
