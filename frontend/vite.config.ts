import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

/**
 * Inject a per-build version param into the /config.js script tag so each
 * new build gets a unique URL — bypasses browser disk cache on config
 * rotations (e.g. the Clerk pub-key swap during the webwhen.ai cutover).
 * Runtime nginx serves /config.js with `Cache-Control: no-store,
 * must-revalidate`, but Chromium honors stale disk-cache entries from prior
 * visits in a way that can race fresh navigations. A different URL =
 * different cache key = the browser actually fetches. Build-time only via
 * `apply: 'build'`; the dev server's unhashed /config.js stays as-is.
 *
 * See #246 (rebrand) + the Clerk pub-key rotation post-mortem in vault.
 */
function hashConfigJs() {
  const buildId = String(Date.now())
  return {
    name: 'hash-config-js',
    apply: 'build' as const,
    transformIndexHtml(html: string) {
      return html.replace(
        /(<script[^>]+src=")(\/config\.js)(")/g,
        `$1$2?v=${buildId}$3`,
      )
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    hashConfigJs(),
    visualizer({
      open: false,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  envDir: '..',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
      'motion',
      'recharts',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        // Only group truly always-needed vendor code into a named chunk.
        // Clerk, Radix, Recharts, Motion are reached exclusively via dynamic
        // imports (React.lazy, route-level code splitting) so letting Rollup
        // split them naturally keeps them off the Landing critical path.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/public': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
