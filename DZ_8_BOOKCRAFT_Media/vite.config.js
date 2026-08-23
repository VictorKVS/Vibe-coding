import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/llm-api": {
        target: "http://127.0.0.1:1234",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/llm-api/, ""),
      },
      "/giga-cloud": {
        target: "https://api.giga.chat",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/giga-cloud/, ""),
      },
    },
  },
});
