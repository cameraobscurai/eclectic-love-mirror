import { defineConfig } from "vitest/config";

// Playwright owns `*.spec.ts` at the repo root; vitest owns `*.test.ts` only.
// Keeping the suffixes disjoint means neither runner ever tries to execute the
// other's files.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.output/**"],
  },
});
