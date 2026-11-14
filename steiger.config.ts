import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    ignores: [
      "**/__tests__/**",
      "**/__mocks__/**",
      "**/routeTree.gen.ts",
      "**/shared/ui/shadcn/**",
    ],
  },
  {
    files: ["./src/**"],
    rules: {
      "fsd/import-locality": "error",
      "fsd/no-wildcard-exports": "error",
    },
  },
  {
    files: ["./src/app/routes/**"],
    rules: {
      "fsd/no-reserved-folder-names": "off",
    },
  },
]);
