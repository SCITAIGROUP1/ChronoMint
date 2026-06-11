import { base } from "@kloqra/config-eslint/base";
import { nestLayers } from "@kloqra/config-eslint/nest";
import { reactLayers } from "@kloqra/config-eslint/react";

export default [
  ...base,
  ...nestLayers,
  ...reactLayers,
  {
    files: ["apps/jira-forge/src/**/*.js"],
    languageOptions: {
      globals: {
        URLSearchParams: "readonly"
      }
    }
  },
  {
    files: ["apps/jira-forge/static/panel/src/**/*.js"],
    languageOptions: {
      globals: {
        document: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly"
      }
    }
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
        AbortSignal: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly"
      }
    }
  }
];
