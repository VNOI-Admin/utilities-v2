// @ts-check
import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),
  kit: {
    paths: {
      base: "/admin",
      relative: false,
    },
    adapter: adapter(),
    csp: {
      directives: {
        "script-src": ["self", "strict-dynamic"],
      },
    },
    alias: {
      $components: "./src/components",
      $images: "./src/images",
      "@libs/common": "../../libs/common/src",
    },
    inlineStyleThreshold: 2048,
  },
};

export default config;
