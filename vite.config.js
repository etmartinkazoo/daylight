import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "frontend"),
    },
  },
  build: {
    outDir: "app/assets/builds",
    emptyOutDir: true,
    rollupOptions: {
      input: "frontend/entrypoints/daylight.jsx",
      output: {
        entryFileNames: "daylight-[hash].js",
        chunkFileNames: "daylight-chunk-[hash].js",
        assetFileNames: "daylight-[hash][extname]",
      },
    },
  },
});
