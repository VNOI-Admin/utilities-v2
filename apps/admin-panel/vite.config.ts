import Vue from '@vitejs/plugin-vue';
// Plugins
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { PrimeVueResolver } from '@primevue/auto-import-resolver';
import Layouts from 'vite-plugin-vue-layouts';
import tsConfigPaths from 'vite-tsconfig-paths';

import path from 'node:path';
// Utilities
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '~/': `${path.resolve(__dirname, 'src')}/`,
    },
    // extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue'],
  },
  plugins: [
    Layouts(),
    tsConfigPaths(),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        '@vueuse/core',
        { 'vue-cookies': ['VueCookies'] },
        { 'vue-toastification': ['useToast'] },
        { '~/hooks/routerRef': [['default', 'routerRef']] },
        { '~/hooks/useLazyPromise': [['default', 'useLazyPromise']] },
      ],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [PrimeVueResolver()],
      dts: 'src/components.d.ts',
    }),
    Vue(),
  ],
  build: {
    outDir: 'dist',
    target: ['esnext'],
  },
  optimizeDeps: {
    // 👈 optimizedeps
    esbuildOptions: {
      target: 'esnext',
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
      supported: {
        bigint: true,
      },
    },
  },
  server: {
    port: 3000,
  },
  clearScreen: false,
});
