import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // La API sirve el build desde ./public; en desarrollo, Vite reenvía /health y /api a ella.
  build: { outDir: "../api/public", emptyOutDir: true },
  server: { proxy: { "/health": "http://localhost:8080", "/api": "http://localhost:8080" } },
});
