import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true, // tunnels (ngrok/cloudflared) for Telegram
    proxy: { "/api": "http://localhost:3001" },
  },
});
