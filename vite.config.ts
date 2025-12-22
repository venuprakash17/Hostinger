import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // HMR will use the same port as the server
    // clientPort is set automatically based on server port
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          ui: ['lucide-react', 'sonner'],
          resume: ['@react-pdf/renderer'],
          charts: ['recharts'], // Separate charts bundle
          monaco: ['@monaco-editor/react'], // Separate Monaco editor bundle
        }
      }
    },
    // Optimize chunk loading
    cssCodeSplit: true,
    // Reduce bundle size
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
