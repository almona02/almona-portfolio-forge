// ESLint flat config for TypeScript + React project: lint src while ignoring heavy/generated content
// Phase 2: recommendedTypeChecked + projectService for type-aware linting. See COMPILER_HARDENING_ACTION_PLAN.md
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
      "public/**",
      // Project service: sidebar.tsx, sonner.tsx not found (tsconfig.eslint.json tried - path resolution issue)
      "src/shared/ui/ui/sidebar.tsx",
      "src/shared/ui/ui/sonner.tsx"
    ]
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      "react": react,
      "react-hooks": reactHooks
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_|^vi$|^mock",
          caughtErrorsIgnorePattern: "^_"
        }
      ],
      // Type-aware rules: warn initially so CI passes (0 errors). Upgrade to error incrementally.
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/restrict-template-expressions": "warn",
      "@typescript-eslint/restrict-plus-operands": "warn",
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-misused-promises": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-redundant-type-constituents": "warn",
      "@typescript-eslint/no-base-to-string": "warn",
      "@typescript-eslint/prefer-promise-reject-errors": "warn",
      "@typescript-eslint/no-unsafe-enum-comparison": "warn",
      "@typescript-eslint/await-thenable": "warn",
      "@typescript-eslint/no-implied-eval": "warn",
      "@typescript-eslint/only-throw-error": "warn",
      "@typescript-eslint/no-unsafe-unary-minus": "warn",
      "@typescript-eslint/no-duplicate-type-constituents": "warn",
      "@typescript-eslint/unbound-method": "warn",
    }
  },
  { files: ["**/goldTier/__tests__/migrateTopPatterns.test.ts"], rules: { "@typescript-eslint/no-unsafe-return": "off" } },
  { files: ["src/utils/profileImport.ts"], rules: { "@typescript-eslint/no-explicit-any": "off", "@typescript-eslint/no-unsafe-assignment": "off", "@typescript-eslint/no-unsafe-call": "off", "@typescript-eslint/no-unsafe-member-access": "off", "@typescript-eslint/no-unsafe-argument": "off", "@typescript-eslint/no-unsafe-return": "off" } },
  { files: ["src/lib/3d/PhysicsEngine.ts"], rules: { "@typescript-eslint/no-explicit-any": "off", "@typescript-eslint/no-unsafe-assignment": "off", "@typescript-eslint/no-unsafe-call": "off", "@typescript-eslint/no-unsafe-member-access": "off", "@typescript-eslint/no-unsafe-argument": "off", "@typescript-eslint/no-unsafe-return": "off", "@typescript-eslint/no-redundant-type-constituents": "off" } },
  { files: ["src/services/__tests__/*.test.ts"], rules: { "@typescript-eslint/no-explicit-any": "off", "@typescript-eslint/no-unsafe-assignment": "off", "@typescript-eslint/no-unsafe-call": "off", "@typescript-eslint/no-unsafe-member-access": "off", "@typescript-eslint/no-unsafe-argument": "off", "@typescript-eslint/no-unsafe-return": "off" } },
  // jobsStore: Supabase Row/Error inference triggers no-unsafe-*; all explicit any removed (2025-02-24)
  { files: ["src/store/jobsStore.ts"], rules: { "@typescript-eslint/no-unsafe-assignment": "off", "@typescript-eslint/no-unsafe-argument": "off" } },
);
