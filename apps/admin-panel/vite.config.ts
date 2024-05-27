import vue from "@vitejs/plugin-vue";
import path from "path";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "~/": `${path.resolve(__dirname, "src")}/`,
    },
  },
  plugins: [
    vue(),
    tsConfigPaths(),
    AutoImport({
      imports: [
        "vue",
        "vue-router",
        "@vueuse/core",
        { "vue-toastification": ["useToast"] },
        { "~/hooks/usePromise": [["default", "usePromise"]] },
        { "~/hooks/useLazyPromise": [["default", "useLazyPromise"]] },
        { "~/hooks/useAlert": [["default", "useAlert"]] },
        { "~/stores/network": ["useNetworkStore"] },
        { "~/stores/icons": ["useIconStore"] },
        { "~/stores/marketImportData": ["useImportData"] },
      ],
      dts: "src/auto-imports.d.ts",
    }),
    Components({
      dirs: ["src/components"],
      extensions: ["vue"],
      dts: "src/components.d.ts",
    }),
  ],
  build: {
    outDir: "dist",
    target: ["esnext"],
  },
  optimizeDeps: {
    // 👈 optimizedeps
    esbuildOptions: {
      target: "esnext",
      // Node.js global to browser globalThis
      define: {
        global: "globalThis",
      },
      supported: {
        bigint: true,
      },
    },
  },
});
