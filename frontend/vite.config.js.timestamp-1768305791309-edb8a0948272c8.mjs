// vite.config.js
import { defineConfig } from "file:///C:/Users/ecgspectrum/Desktop/windowbuysial_v2/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/ecgspectrum/Desktop/windowbuysial_v2/frontend/node_modules/@vitejs/plugin-react-swc/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Enable compression in dev
    middlewareMode: false
  },
  base: "/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    minify: "esbuild",
    target: "es2020",
    cssCodeSplit: true,
    // Aggressive code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react-core";
          }
          if (id.includes("react-router")) {
            return "router";
          }
          if (id.includes("recharts")) {
            return "charts";
          }
          if (id.includes("socket.io")) {
            return "realtime";
          }
          if (id.includes("react-phone-number-input") || id.includes("libphonenumber")) {
            return "phone-utils";
          }
          if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("json2csv")) {
            return "export-utils";
          }
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
        // Optimize chunk file names for caching
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]"
      }
    },
    chunkSizeWarningLimit: 500,
    // Report compressed size
    reportCompressedSize: true
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
    // Exclude large libraries from pre-bundling
    exclude: ["recharts"]
  },
  // Enable esbuild optimizations
  esbuild: {
    drop: ["console", "debugger"],
    // Remove console.log in production
    legalComments: "none",
    treeShaking: true
  },
  // CSS optimization
  css: {
    devSourcemap: false
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxlY2dzcGVjdHJ1bVxcXFxEZXNrdG9wXFxcXHdpbmRvd2J1eXNpYWxfdjJcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGVjZ3NwZWN0cnVtXFxcXERlc2t0b3BcXFxcd2luZG93YnV5c2lhbF92MlxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvZWNnc3BlY3RydW0vRGVza3RvcC93aW5kb3didXlzaWFsX3YyL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgICAvLyBFbmFibGUgY29tcHJlc3Npb24gaW4gZGV2XG4gICAgbWlkZGxld2FyZU1vZGU6IGZhbHNlLFxuICB9LFxuICBiYXNlOiAnLycsXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgYXNzZXRzRGlyOiAnYXNzZXRzJyxcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIG1pbmlmeTogJ2VzYnVpbGQnLFxuICAgIHRhcmdldDogJ2VzMjAyMCcsXG4gICAgY3NzQ29kZVNwbGl0OiB0cnVlLFxuICAgIC8vIEFnZ3Jlc3NpdmUgY29kZSBzcGxpdHRpbmcgZm9yIGJldHRlciBjYWNoaW5nXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rcyhpZCkge1xuICAgICAgICAgIC8vIENvcmUgUmVhY3QgLSByYXJlbHkgY2hhbmdlcywgY2FjaGUgbG9uZy10ZXJtXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvcmVhY3QnKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3JlYWN0LWRvbScpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3JlYWN0LWNvcmUnXG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFJvdXRlciAtIHNlcGFyYXRlIGNodW5rXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWFjdC1yb3V0ZXInKSkge1xuICAgICAgICAgICAgcmV0dXJuICdyb3V0ZXInXG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIENoYXJ0cyBsaWJyYXJ5IC0gbGFyZ2UsIGxvYWQgb24gZGVtYW5kXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWNoYXJ0cycpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2NoYXJ0cydcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gU29ja2V0LmlvIGZvciByZWFsLXRpbWUgZmVhdHVyZXNcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3NvY2tldC5pbycpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3JlYWx0aW1lJ1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBQaG9uZSBpbnB1dCBsaWJyYXJ5XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWFjdC1waG9uZS1udW1iZXItaW5wdXQnKSB8fCBpZC5pbmNsdWRlcygnbGlicGhvbmVudW1iZXInKSkge1xuICAgICAgICAgICAgcmV0dXJuICdwaG9uZS11dGlscydcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUERGL0V4cG9ydCBsaWJyYXJpZXNcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2pzcGRmJykgfHwgaWQuaW5jbHVkZXMoJ2h0bWwyY2FudmFzJykgfHwgaWQuaW5jbHVkZXMoJ2pzb24yY3N2JykpIHtcbiAgICAgICAgICAgIHJldHVybiAnZXhwb3J0LXV0aWxzJ1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBBbGwgb3RoZXIgdmVuZG9yIGNvZGVcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvcidcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8vIE9wdGltaXplIGNodW5rIGZpbGUgbmFtZXMgZm9yIGNhY2hpbmdcbiAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5qcycsXG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICBhc3NldEZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLltleHRdJ1xuICAgICAgfVxuICAgIH0sXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiA1MDAsXG4gICAgLy8gUmVwb3J0IGNvbXByZXNzZWQgc2l6ZVxuICAgIHJlcG9ydENvbXByZXNzZWRTaXplOiB0cnVlLFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgLy8gRXhjbHVkZSBsYXJnZSBsaWJyYXJpZXMgZnJvbSBwcmUtYnVuZGxpbmdcbiAgICBleGNsdWRlOiBbJ3JlY2hhcnRzJ11cbiAgfSxcbiAgLy8gRW5hYmxlIGVzYnVpbGQgb3B0aW1pemF0aW9uc1xuICBlc2J1aWxkOiB7XG4gICAgZHJvcDogWydjb25zb2xlJywgJ2RlYnVnZ2VyJ10sIC8vIFJlbW92ZSBjb25zb2xlLmxvZyBpbiBwcm9kdWN0aW9uXG4gICAgbGVnYWxDb21tZW50czogJ25vbmUnLFxuICAgIHRyZWVTaGFraW5nOiB0cnVlLFxuICB9LFxuICAvLyBDU1Mgb3B0aW1pemF0aW9uXG4gIGNzczoge1xuICAgIGRldlNvdXJjZW1hcDogZmFsc2UsXG4gIH1cbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWdXLFNBQVMsb0JBQW9CO0FBQzdYLE9BQU8sV0FBVztBQUVsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUEsSUFFTixnQkFBZ0I7QUFBQSxFQUNsQjtBQUFBLEVBQ0EsTUFBTTtBQUFBLEVBQ04sT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsUUFBUTtBQUFBLElBQ1IsUUFBUTtBQUFBLElBQ1IsY0FBYztBQUFBO0FBQUEsSUFFZCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixhQUFhLElBQUk7QUFFZixjQUFJLEdBQUcsU0FBUyxvQkFBb0IsS0FBSyxHQUFHLFNBQVMsd0JBQXdCLEdBQUc7QUFDOUUsbUJBQU87QUFBQSxVQUNUO0FBRUEsY0FBSSxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBQy9CLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLFVBQVUsR0FBRztBQUMzQixtQkFBTztBQUFBLFVBQ1Q7QUFFQSxjQUFJLEdBQUcsU0FBUyxXQUFXLEdBQUc7QUFDNUIsbUJBQU87QUFBQSxVQUNUO0FBRUEsY0FBSSxHQUFHLFNBQVMsMEJBQTBCLEtBQUssR0FBRyxTQUFTLGdCQUFnQixHQUFHO0FBQzVFLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLE9BQU8sS0FBSyxHQUFHLFNBQVMsYUFBYSxLQUFLLEdBQUcsU0FBUyxVQUFVLEdBQUc7QUFDakYsbUJBQU87QUFBQSxVQUNUO0FBRUEsY0FBSSxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBQy9CLG1CQUFPO0FBQUEsVUFDVDtBQUFBLFFBQ0Y7QUFBQTtBQUFBLFFBRUEsZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsTUFDbEI7QUFBQSxJQUNGO0FBQUEsSUFDQSx1QkFBdUI7QUFBQTtBQUFBLElBRXZCLHNCQUFzQjtBQUFBLEVBQ3hCO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBO0FBQUEsSUFFbEQsU0FBUyxDQUFDLFVBQVU7QUFBQSxFQUN0QjtBQUFBO0FBQUEsRUFFQSxTQUFTO0FBQUEsSUFDUCxNQUFNLENBQUMsV0FBVyxVQUFVO0FBQUE7QUFBQSxJQUM1QixlQUFlO0FBQUEsSUFDZixhQUFhO0FBQUEsRUFDZjtBQUFBO0FBQUEsRUFFQSxLQUFLO0FBQUEsSUFDSCxjQUFjO0FBQUEsRUFDaEI7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
