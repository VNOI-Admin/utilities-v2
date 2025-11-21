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
      resolvers: [
        {
          type: 'component',
          resolve: (name: string) => {
            if (name.match(/^[A-Z]/)) {
              // Match lucide icon names (PascalCase starting with capital letter)
              const lucideIcons = ['AlertCircle', 'AlertTriangle', 'Archive', 'ArrowLeft', 'ArrowRight', 'Bell', 'Calendar', 'Camera', 'CheckCircle', 'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ChevronUp', 'Clock', 'Copy', 'Download', 'Edit', 'Eye', 'EyeOff', 'FileText', 'Filter', 'Folder', 'Gauge', 'Grid', 'Heart', 'Home', 'Image', 'Info', 'Layers', 'Layout', 'Link', 'List', 'Lock', 'LogOut', 'Mail', 'Menu', 'MessageSquare', 'Minimize', 'Maximize', 'Minus', 'MoreHorizontal', 'MoreVertical', 'Move', 'Music', 'Pause', 'Play', 'Plus', 'Power', 'Printer', 'Quote', 'RefreshCw', 'RefreshCcw', 'Search', 'Send', 'Settings', 'Share', 'Share2', 'ShoppingCart', 'Slash', 'Smartphone', 'Square', 'Star', 'Target', 'Trash', 'Trash2', 'Trending', 'TrendingDown', 'TrendingUp', 'Triangle', 'X', 'ZoomIn', 'ZoomOut', 'Zap'];
              if (lucideIcons.includes(name)) {
                return { name, from: 'lucide-vue-next' };
              }
            }
          }
        }
      ]
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
