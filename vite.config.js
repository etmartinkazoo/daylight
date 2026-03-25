import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "path";

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "frontend"),
    },
  },
  build: {
    outDir: "app/assets/builds",
    emptyOutDir: true,
    rollupOptions: {
      input: "frontend/entrypoints/daylight.js",
      output: {
        entryFileNames: "daylight-[hash].js",
        chunkFileNames: "daylight-chunk-[hash].js",
        assetFileNames: "daylight-[hash][extname]",
      },
    },
  },
});
