import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./": la construcción funciona servida desde cualquier subcarpeta (por ejemplo /v4/).
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { host: "127.0.0.1", port: 5301, strictPort: true },
});
