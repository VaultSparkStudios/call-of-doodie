import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { toVitestCoverageConfig } from "./scripts/lib/coverage-contract.mjs";

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React runtime in its own chunk — cached across deploys
          "vendor-react": ["react", "react-dom"],
          // Keep optional data clients on their natural dynamic-import graph.
          // Forcing Supabase into a manual chunk turns it into an entry preload,
          // paying the data-plane cost before a player opens an online surface.
          // gifenc only loaded when GIF encoding triggers (dynamic import in App.jsx)
          // already split automatically; this keeps it explicit
        },
      },
    },
    // Silence the 500kB warning — game bundles are expected to be large
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: "jsdom",
    globals: true,
    // Keep the full App launch smoke from competing with an unbounded set of
    // module transforms. Four workers is faster in practice on the Windows
    // closeout host and gives the launch contract deterministic CPU/memory.
    maxWorkers: 4,
    include: ["src/**/*.test.{js,jsx}", "tests/**/*.test.{js,jsx}", "scripts/**/*.test.mjs"],
    testTimeout: 30000,
    coverage: toVitestCoverageConfig(),
  },
});
