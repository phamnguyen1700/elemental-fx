import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"]
    }
  }
});
