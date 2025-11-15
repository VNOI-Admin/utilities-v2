import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import Layouts from 'vite-plugin-vue-layouts';

export default defineConfig({
  plugins: [
    vue(),
    viteTsconfigPaths(),
    Layouts({
      layoutsDirs: 'src/layouts',
      defaultLayout: 'default',
    }),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        '@vueuse/core',
        { 'js-cookie': ['default', 'Cookies'] },
        { 'vue-toastification': ['useToast'] },
      ],
      dts: 'src/auto-imports.d.ts',
      dirs: ['src/hooks/**', 'src/stores/**'],
      vueTemplate: true,
    }),
    Components({
      dirs: ['src/components'],
      dts: 'src/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '~/': `${path.resolve(__dirname, 'src')}/`,
    },
  },
  server: {
    port: 8000,
  },
});
