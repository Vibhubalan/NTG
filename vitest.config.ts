import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@core": path.resolve(__dirname, "./src/core"),
      "@auth-membership": path.resolve(__dirname, "./src/modules/auth-membership"),
      "@tournaments-leagues": path.resolve(__dirname, "./src/modules/tournaments-leagues"),
      "@socials-gallery": path.resolve(__dirname, "./src/modules/socials-gallery"),
      "@landing-home": path.resolve(__dirname, "./src/modules/landing-home"),
    },
  },
});
