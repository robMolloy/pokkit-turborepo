/// <reference types="vite/client" />
/// <reference types="vitest" />

import type { ConfigEnv } from "vite";
import { loadEnv, defineConfig as defineViteConfig, mergeConfig } from "vite";
import { defineConfig as defineVitestConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const viteConfig = (p: { mode: ConfigEnv }) => {
  const env = loadEnv(p.mode.command, process.cwd(), "");

  return defineViteConfig({
    base: env.VITE_APP_BASE_URL,
    plugins: [react()],
  });
};

const vitestConfig = (_: { mode: ConfigEnv }) => {
  return defineVitestConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/setupTests.ts",
    },
  });
};

export default (p: { mode: ConfigEnv }) => {
  return mergeConfig(viteConfig(p), vitestConfig(p));
};
