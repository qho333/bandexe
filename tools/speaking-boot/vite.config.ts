// Builds the site's boot intro as one script for mockups/speaking (prototype, not deployed).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  define: { "process.env.NODE_ENV": '"production"' },
  build: {
    outDir: fileURLToPath(new URL("../../../app/public/speaking/boot", import.meta.url)),
    emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL("./entry.tsx", import.meta.url)), formats: ["es"], fileName: () => "boot.js", cssFileName: "boot" },
  },
});
