module.exports = {
  forbidden: [
    {
      name: "core-depends-on-nothing-internal",
      severity: "error",
      from: { path: "^packages/core" },
      to: { path: "^(packages/(?!core)|apps/)" },
    },
    {
      name: "web-talks-to-api-over-http-only",
      severity: "error",
      from: { path: "^apps/web" },
      to: { path: "^packages/(core|db|ai|x-api|payment|email)" },
    },
    {
      name: "ui-is-standalone",
      severity: "error",
      from: { path: "^packages/ui" },
      to: { path: "^(packages/(?!ui)|apps/)" },
    },
    {
      name: "contracts-depend-on-nothing-internal",
      severity: "error",
      from: { path: "^packages/contracts" },
      to: { path: "^(packages/(?!contracts)|apps/)" },
    },
    {
      name: "provider-sdks-only-in-their-adapter",
      severity: "error",
      from: { pathNot: "^packages/(ai|payment)" },
      to: {
        dependencyTypes: ["npm"],
        path: "^(openai|@anthropic-ai|stripe|paystack)",
      },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
