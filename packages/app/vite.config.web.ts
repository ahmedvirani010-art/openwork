import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import solid from "vite-plugin-solid";

/**
 * Vite Configuration for Web Build
 *
 * This configuration is used for building the web version of OpenWork.
 * It excludes Tauri-specific dependencies and optimizes for browser deployment.
 */
export default defineConfig({
  plugins: [tailwindcss(), solid()],

  // Development server config
  server: {
    port: 5173,
    strictPort: false,
    host: true, // Listen on all addresses for Docker
    cors: true,
  },

  // Build configuration
  build: {
    target: "es2020", // Modern browsers
    outDir: "dist-web",
    sourcemap: true,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging
        drop_debugger: true,
      },
    },

    // Optimize bundle splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for framework code
          vendor: ["solid-js", "@solidjs/router"],

          // SDK chunk for OpenCode integration
          sdk: ["@opencode-ai/sdk"],
        },
      },
    },

    // Chunk size warnings
    chunkSizeWarningLimit: 1000, // KB
  },

  // Define platform mode at build time
  define: {
    "import.meta.env.VITE_PLATFORM": JSON.stringify("web"),
    "import.meta.env.VITE_BUILD_TARGET": JSON.stringify("web"),
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ["solid-js", "@solidjs/router", "@opencode-ai/sdk"],
    exclude: [
      // Exclude Tauri dependencies from web build
      "@tauri-apps/api",
      "@tauri-apps/plugin-dialog",
      "@tauri-apps/plugin-opener",
      "@tauri-apps/plugin-process",
      "@tauri-apps/plugin-updater",
    ],
  },

  // Public base path
  base: "/",

  // Environment variables
  envPrefix: "VITE_",
});
