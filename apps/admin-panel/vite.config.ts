import Vue from '@vitejs/plugin-vue';
// Plugins
import AutoImport from 'unplugin-auto-import/vite';
import Fonts from 'unplugin-fonts/vite';
import Components from 'unplugin-vue-components/vite';
import Layouts from 'vite-plugin-vue-layouts';
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';
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
      dirs: ['src/components'],
      extensions: ['vue'],
      dts: 'src/components.d.ts',
    }),
    Vue({
      template: { transformAssetUrls },
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/styles/settings.scss',
      },
    }),
    Fonts({
      google: {
        families: [
          {
            name: 'Roboto',
            styles: 'wght@100;300;400;500;700;900',
          },
        ],
      },
    }),
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
