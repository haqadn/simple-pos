import { fileURLToPath, URL } from "node:url";
import path from 'path'

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";

// https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vite-plugin
import vuetify from "vite-plugin-vuetify";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx(), vuetify({ autoImport: true })],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Prevent vendor.js being created
        manualChunks: undefined,
        // chunkFileNames: "zzz-[name].js",
        // this got rid of the hash on style.css
        assetFileNames: "assets/[name].[ext]",

        entryFileNames: "[name].js",
      },
    },
    // Prevent vendor.css being created
    cssCodeSplit: false,
    // prevent some warnings
    chunkSizeWarningLimit: 60000,
  },
});
