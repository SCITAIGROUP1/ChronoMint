import { base } from "@kloqra/config-eslint/base";
import { nestLayers } from "@kloqra/config-eslint/nest";
import { reactLayers } from "@kloqra/config-eslint/react";

export default [
  ...base,
  ...nestLayers,
  ...reactLayers,
  {
    files: ["scripts/**/*.mjs", ".cursor/skills/**/scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
        AbortSignal: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        URL: "readonly"
      }
    },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-unused-vars": "off"
    }
  },
  {
    files: ["apps/api/prisma/apply-dashboard-layouts.ts"],
    rules: {
      "no-console": "off"
    }
  }
];
