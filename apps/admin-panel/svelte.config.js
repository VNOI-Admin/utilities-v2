import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    csp: {
      directives: {
        "script-src": ["self", "strict-dynamic"],
      },
    },
    alias: {
      $components: "./src/components",
      $images: "./src/images",
    },
    inlineStyleThreshold: 2048,
    paths: {
      relative: false,
    },
  },
};

export default config;
