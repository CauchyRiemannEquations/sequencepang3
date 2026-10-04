import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: { emptyOutDir: true, manifest: true, rollupOptions: { input: { main: "index.html", coconut: "coconut/index.html" } } },
  server: { port: 5183, strictPort: true },
});
