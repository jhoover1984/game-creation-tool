export default [
  {
    files: ["tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        global: "writable",
        setImmediate: "readonly",
        console: "readonly",
        process: "readonly",
      },
    },
  },
  {
    files: ["src/**/*.js", "tests/**/*.mjs", "tests-e2e/**/*.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        URL: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLElement: "readonly",
        HTMLCanvasElement: "readonly",
        requestAnimationFrame: "readonly",
        FileReader: "readonly",
        Event: "readonly",
        PointerEvent: "readonly",
        CustomEvent: "readonly"
      }
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }
      ],
      "no-undef": "error",
      eqeqeq: ["error", "always"],
      "no-console": "off",
      "no-restricted-properties": [
        "warn",
        {
          property: "innerHTML",
          message:
            "Avoid direct innerHTML writes. Prefer textContent/createElement or escaped helper wrappers."
        },
        {
          property: "outerHTML",
          message: "Avoid outerHTML writes in editor/runtime code paths."
        },
        {
          property: "insertAdjacentHTML",
          message:
            "Avoid insertAdjacentHTML. Use explicit DOM construction or escaped helper wrappers."
        }
      ]
    }
  }
];
