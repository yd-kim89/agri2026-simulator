import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/simulate.ts", "lib/data.ts"],
      reporter: ["text", "json-summary"],
    },
  },
});
