import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Separate CommonJS Node.js backend, has its own conventions/tooling.
    "server/**",
    // One-off CommonJS Node scripts that generate client deliverables
    // (Word reports); not part of the app bundle.
    "docs/**",
  ]),
]);

export default eslintConfig;
