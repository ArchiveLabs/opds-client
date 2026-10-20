import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, loadEnv } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
export default defineConfig(({ mode }) => ({
  plugins: [sveltekit(), basicSsl()],
  server: {
    // Set DEV_HOST to serve from a hostname the OPDS server trusts (see README).
    host: loadEnv(mode, ".", "").DEV_HOST || "localhost",
    port: 5173,
    strictPort: true,
  },
}));
