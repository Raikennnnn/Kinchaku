import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// The site lives under a sub-path on GitHub Pages (/kinchaku/); set BASE_PATH there.
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  build: {
    rolldownOptions: {
      // Two pages: the website at / and the app itself at /app/.
      input: {
        site: resolve(import.meta.dirname, "index.html"),
        app: resolve(import.meta.dirname, "app/index.html"),
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // New versions install in the background and apply on the next open.
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "logo.svg", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Kinchaku",
        short_name: "Kinchaku",
        description: "A free, offline-first budget tracker.",
        lang: "en",
        display: "standalone",
        orientation: "portrait",
        // Installing from the website or the app both open the app.
        start_url: "app/",
        scope: "./",
        theme_color: "#1f2a44",
        background_color: "#f4f4f1",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Cache both pages and their assets so the app opens with no connection.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest,woff2}"],
        // Google sign-in pages come from Firebase through /__/auth/ (see
        // vercel.json); they must reach the network, not the cached site.
        navigateFallbackDenylist: [/^\/__\//],
      },
    }),
  ],
});
