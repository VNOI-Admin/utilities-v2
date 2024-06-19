module.exports = {
  parser: 'vue-eslint-parser',
  parserOptions: {
    project: './tsconfig.json',
    extraFileExtensions: ['.vue'],
  },
  env: {
    node: true,
  },
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
  ],
  rules: {
    'vue/multi-word-component-names': 'off',
    "vue/no-v-model-argument": "off"
  },
};
