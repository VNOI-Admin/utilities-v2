module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    tsconfigRootDir: __dirname,
    sourceType: "module",
    ecmaVersion: 2020,
    extraFileExtensions: [".svelte"],
    warnOnUnsupportedTypeScriptVersion: false,
  },
  plugins: ["@typescript-eslint", "simple-import-sort"],
  extends: [
    "plugin:@typescript-eslint/recommended",
    "prettier",
    "plugin:tailwindcss/recommended",
    "plugin:svelte/recommended",
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [".eslintrc.js"],
  rules: {
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        ignoreRestSiblings: true,
        varsIgnorePattern: "^(_|\\$\\$)",
        argsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "simple-import-sort/imports": "warn",
    "simple-import-sort/exports": "warn",
    "svelte/valid-compile": "off",
    "tailwindcss/no-custom-classname": "off",
    "tailwindcss/classnames-order": "off",
  },
  overrides: [
    {
      files: ["*.svelte"],
      parser: "svelte-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
      },
    },
  ],
};
