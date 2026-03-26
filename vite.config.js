import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/call-of-doodie/",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React runtime in its own chunk — cached across deploys
          "vendor-react": ["react", "react-dom"],
          // gifenc only loaded when GIF encoding triggers (dynamic import in App.jsx)
          // already split automatically; this keeps it explicit
        },
      },
    },
    // Silence the 500kB warning — game bundles are expected to be large
    chunkSizeWarningLimit: 800,
  },
});
