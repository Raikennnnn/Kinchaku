import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// logo.svg already has a full-bleed background and keeps the artwork inside
// the maskable safe zone, so no extra padding is added around it.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0 },
    apple: { ...minimal2023Preset.apple, padding: 0 },
  },
  images: ["public/logo.svg"],
});
