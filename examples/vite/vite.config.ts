import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@elemental-fx/canvas-effects/react": fileURLToPath(
        new URL("../../packages/canvas-effects/react/index.ts", import.meta.url)
      ),
      "@elemental-fx/fluid-effects/react": fileURLToPath(
        new URL("../../packages/fluid-effects/react/index.ts", import.meta.url)
      )
    }
  }
});
