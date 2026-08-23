import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: import.meta.dirname,
  base: "./",
  plugins: [react()],
  build: {
    outDir: resolve(import.meta.dirname, "../output/visual-harness-build"),
    emptyOutDir: true,
    rollupOptions: { input: resolve(import.meta.dirname, "operation.html") },
  },
});
