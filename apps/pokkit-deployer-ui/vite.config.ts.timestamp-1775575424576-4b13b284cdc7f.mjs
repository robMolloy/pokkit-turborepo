// vite.config.ts
import path from "path";
import { defineConfig } from "file:///Users/robert.molloy/Projects/current/pokkit-turborepo/node_modules/.pnpm/vite@5.4.21_@types+node@22.19.15_lightningcss@1.31.1/node_modules/vite/dist/node/index.js";
import react from "file:///Users/robert.molloy/Projects/current/pokkit-turborepo/node_modules/.pnpm/@vitejs+plugin-react@3.1.0_vite@5.4.21_@types+node@22.19.15_lightningcss@1.31.1_/node_modules/@vitejs/plugin-react/dist/index.mjs";
import Pages from "file:///Users/robert.molloy/Projects/current/pokkit-turborepo/node_modules/.pnpm/vite-plugin-pages@0.33.3_vite@5.4.21_@types+node@22.19.15_lightningcss@1.31.1_/node_modules/vite-plugin-pages/dist/index.js";
import tailwindcss from "file:///Users/robert.molloy/Projects/current/pokkit-turborepo/node_modules/.pnpm/@tailwindcss+vite@4.2.1_vite@5.4.21_@types+node@22.19.15_lightningcss@1.31.1_/node_modules/@tailwindcss/vite/dist/index.mjs";
var __vite_injected_original_dirname = "/Users/robert.molloy/Projects/current/pokkit-turborepo/apps/pokkit-deployer-ui";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    Pages({
      dirs: "src/pages",
      extensions: ["page.tsx", "tsx"]
    }),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvcm9iZXJ0Lm1vbGxveS9Qcm9qZWN0cy9jdXJyZW50L3Bva2tpdC10dXJib3JlcG8vYXBwcy9wb2traXQtZGVwbG95ZXItdWlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9yb2JlcnQubW9sbG95L1Byb2plY3RzL2N1cnJlbnQvcG9ra2l0LXR1cmJvcmVwby9hcHBzL3Bva2tpdC1kZXBsb3llci11aS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvcm9iZXJ0Lm1vbGxveS9Qcm9qZWN0cy9jdXJyZW50L3Bva2tpdC10dXJib3JlcG8vYXBwcy9wb2traXQtZGVwbG95ZXItdWkvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcbmltcG9ydCBQYWdlcyBmcm9tIFwidml0ZS1wbHVnaW4tcGFnZXNcIjtcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tIFwiQHRhaWx3aW5kY3NzL3ZpdGVcIjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgUGFnZXMoe1xuICAgICAgZGlyczogXCJzcmMvcGFnZXNcIixcbiAgICAgIGV4dGVuc2lvbnM6IFtcInBhZ2UudHN4XCIsIFwidHN4XCJdLFxuICAgIH0pLFxuICAgIHRhaWx3aW5kY3NzKCksXG4gIF0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE0WixPQUFPLFVBQVU7QUFDN2EsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sV0FBVztBQUNsQixPQUFPLGlCQUFpQjtBQUp4QixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsTUFDSixNQUFNO0FBQUEsTUFDTixZQUFZLENBQUMsWUFBWSxLQUFLO0FBQUEsSUFDaEMsQ0FBQztBQUFBLElBQ0QsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
