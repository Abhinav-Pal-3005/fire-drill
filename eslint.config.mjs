import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import firebaseRulesPlugin from "@firebase/eslint-plugin-security-rules";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  firebaseRulesPlugin.configs["flat/recommended"],
  globalIgnores([".next/**", "out/**", "build/**", "dist/**/*", "public/assets/**", "next-env.d.ts"]),
]);
