import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/dist/**",
    "**/.turbo/**",
    "**/coverage/**",
    "**/next-env.d.ts",
  ]),
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    extends: [js.configs.recommended],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ["apps/web/**/*.{js,jsx,ts,tsx}"],
    extends: [nextVitals],
    settings: { next: { rootDir: "apps/web/" } },
  },
  {
    files: ["*.mjs", "scripts/**/*.mjs", "apps/{api,worker}/**/*.{ts,mjs}"],
    languageOptions: { globals: globals.node },
  },
  prettier,
]);
