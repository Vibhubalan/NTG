import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const moduleBoundaryRules = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: [
              "@auth-membership/infrastructure/*",
              "@auth-membership/domain/*",
              "@tournaments-leagues/infrastructure/*",
              "@tournaments-leagues/domain/*",
            ],
            message:
              "Import from module index.ts or api/ only — infrastructure and domain are internal.",
          },
          {
            group: [
              "@auth-membership/*",
              "@tournaments-leagues/*",
            ],
            importNames: ["prisma"],
            message: "Use @core/database/client for Prisma access outside owning module infrastructure.",
          },
        ],
        paths: [
          {
            name: "@/components",
            message: "Platform modules must not import marketing components directly.",
          },
        ],
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Valid production patterns flagged by React 19 compiler rules — keep as warnings for CI.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@core/database/*", "@auth-membership/*", "@tournaments-leagues/*", "@landing-home/*"],
              message: "Marketing components must not call modules or DB directly — use API routes or server adapters in phase 2.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/**/*.{ts,tsx}"],
    ...moduleBoundaryRules,
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
