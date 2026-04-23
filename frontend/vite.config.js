import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  server: {
    port: 3000,
    strictPort: false, // if 3000 is busy, Vite will try 3001, 3002, etc.
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("error", (err, req) => {
            // Visible in the Vite terminal — helps debug "why is my API 500?"
            console.error(`[proxy error] ${req.method} ${req.url} →`, err.message);
          });
        },
      },
      "/uploads": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "build",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
});
