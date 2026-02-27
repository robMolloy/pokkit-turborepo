/// <reference types="vite/client" />
/// <reference types="vitest" />

import type { ConfigEnv } from "vite";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default (p: { mode: ConfigEnv }) => {
  const env = loadEnv(p.mode.command, process.cwd(), "");

  return defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/setupTests.ts",
    },
  });
};
