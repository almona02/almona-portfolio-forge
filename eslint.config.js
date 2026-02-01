// ESLint flat config for TypeScript + React project: lint src while ignoring heavy/generated content
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "archive/**",
      "python_backend/**",
      "public/**"
    ]
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react": react,
      "react-hooks": reactHooks
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Loosen some strict TypeScript rules to reduce noise
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_|^vi$|^mock",
          caughtErrorsIgnorePattern: "^_"
        }
      ]
    }
  }
);
