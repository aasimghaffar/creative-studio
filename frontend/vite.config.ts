import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3001,
    strictPort: true,
    open: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        // Split heavy vendor code into cacheable chunks
        manualChunks: {
          react: ["react", "react-dom", "react-router"],
          motion: ["motion"],
        },
      },
    },
  },
});
