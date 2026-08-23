import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { toVitestCoverageConfig } from "./scripts/lib/coverage-contract.mjs";
import { copyrightYear, deriveContentVersionDate } from "./scripts/lib/build-date.mjs";

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/",
  define: {
    // S155: content dates derive from git at build time (see build-date.mjs)
    // so browser code (SiteFooter ©, Field Manual effective date) can't drift.
    __COD_CONTENT_DATE__: JSON.stringify(deriveContentVersionDate()),
    __COD_COPYRIGHT_YEAR__: JSON.stringify(String(copyrightYear())),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React runtime in its own chunk — cached across deploys.
          if (/node_modules\/(react|react-dom)\//.test(id)) return "vendor-react";
          // Keep the new deterministic Operation authority receipts isolated
          // from the long-lived App shell and independently budgeted.
          if (/\/src\/systems\/operation(?:MissionSnapshot|Proximity|Score)\.js$/.test(id)) {
            return "operation-authority";
          }
          // Keep optional data clients on their natural dynamic-import graph.
          // Forcing Supabase into a manual chunk turns it into an entry preload,
          // paying the data-plane cost before a player opens an online surface.
          // gifenc already splits when GIF encoding triggers.
          return undefined;
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
