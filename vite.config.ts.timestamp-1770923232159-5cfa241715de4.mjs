// vite.config.ts
import path from "path";
import { defineConfig, loadEnv } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: "./",
    server: {
      port: 3e3,
      host: "0.0.0.0"
    },
    plugins: [react()],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY)
    },
    optimizeDeps: {
      include: [
        "@revenuecat/purchases-capacitor-ui",
        "@revenuecat/purchases-capacitor",
        "@revenuecat/purchases-typescript-internal-esm"
      ]
    },
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "."),
        "@revenuecat/purchases-capacitor-ui": path.resolve(
          __vite_injected_original_dirname,
          "node_modules/@revenuecat/purchases-capacitor-ui/dist/esm/index.js"
        )
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZEVudiB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICAgIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgJy4nLCAnJyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGJhc2U6ICcuLycsXG4gICAgICBzZXJ2ZXI6IHtcbiAgICAgICAgcG9ydDogMzAwMCxcbiAgICAgICAgaG9zdDogJzAuMC4wLjAnLFxuICAgICAgfSxcbiAgICAgIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgICAgIGRlZmluZToge1xuICAgICAgICAncHJvY2Vzcy5lbnYuQVBJX0tFWSc6IEpTT04uc3RyaW5naWZ5KGVudi5HRU1JTklfQVBJX0tFWSksXG4gICAgICAgICdwcm9jZXNzLmVudi5HRU1JTklfQVBJX0tFWSc6IEpTT04uc3RyaW5naWZ5KGVudi5HRU1JTklfQVBJX0tFWSlcbiAgICAgIH0sXG4gICAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgICAgaW5jbHVkZTogW1xuICAgICAgICAgICdAcmV2ZW51ZWNhdC9wdXJjaGFzZXMtY2FwYWNpdG9yLXVpJyxcbiAgICAgICAgICAnQHJldmVudWVjYXQvcHVyY2hhc2VzLWNhcGFjaXRvcicsXG4gICAgICAgICAgJ0ByZXZlbnVlY2F0L3B1cmNoYXNlcy10eXBlc2NyaXB0LWludGVybmFsLWVzbSdcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIGFsaWFzOiB7XG4gICAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLicpLFxuICAgICAgICAgICdAcmV2ZW51ZWNhdC9wdXJjaGFzZXMtY2FwYWNpdG9yLXVpJzogcGF0aC5yZXNvbHZlKFxuICAgICAgICAgICAgX19kaXJuYW1lLFxuICAgICAgICAgICAgJ25vZGVfbW9kdWxlcy9AcmV2ZW51ZWNhdC9wdXJjaGFzZXMtY2FwYWNpdG9yLXVpL2Rpc3QvZXNtL2luZGV4LmpzJ1xuICAgICAgICAgICksXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLE9BQU8sVUFBVTtBQUMxTyxTQUFTLGNBQWMsZUFBZTtBQUN0QyxPQUFPLFdBQVc7QUFGbEIsSUFBTSxtQ0FBbUM7QUFJekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDdEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxLQUFLLEVBQUU7QUFDakMsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLElBQ1I7QUFBQSxJQUNBLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxJQUNqQixRQUFRO0FBQUEsTUFDTix1QkFBdUIsS0FBSyxVQUFVLElBQUksY0FBYztBQUFBLE1BQ3hELDhCQUE4QixLQUFLLFVBQVUsSUFBSSxjQUFjO0FBQUEsSUFDakU7QUFBQSxJQUNBLGNBQWM7QUFBQSxNQUNaLFNBQVM7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsR0FBRztBQUFBLFFBQ2hDLHNDQUFzQyxLQUFLO0FBQUEsVUFDekM7QUFBQSxVQUNBO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNKLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
