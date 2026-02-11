import * as path from 'path';
import * as fs from 'fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import electron from 'vite-plugin-electron/simple';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
const appVersion = packageJson.version;

export default defineConfig(({ command, mode }) => {
  // Only skip electron plugin during dev server in CI (no display available for Electron)
  // Always include it during build - we need dist-electron/main.js for electron-builder
  const skipElectron =
    command === 'serve' && (process.env.CI === 'true' || process.env.VITE_SKIP_ELECTRON === 'true');

  // Load environment variables based on mode
  // For Juno deployments, use JUNO_ENV to determine the environment
  const junoEnv = process.env.JUNO_ENV || mode;
  const envFiles = [
    `.env.juno.${junoEnv}`,
    `.env.juno.local`,
    `.env.${mode}`,
    `.env.local`,
    `.env`,
  ];

  // Load env files
  const env = loadEnv(mode, __dirname, '');

  // Check if this is a Juno build
  const isJunoBuild = process.env.JUNO_ENV !== undefined || env.JUNO_ENV !== undefined;

  // Determine if we should generate source maps
  const isProduction = junoEnv === 'production';
  const isStaging = junoEnv === 'staging';
  const shouldGenerateSourcemap = !isProduction && !isStaging;

  return {
    plugins: [
      // Only include electron plugin when not in CI/headless dev mode
      ...(skipElectron
        ? []
        : [
            electron({
              main: {
                entry: 'src/main.ts',
                vite: {
                  build: {
                    outDir: 'dist-electron',
                    rollupOptions: {
                      external: ['electron'],
                    },
                  },
                },
              },
              preload: {
                input: 'src/preload.ts',
                vite: {
                  build: {
                    outDir: 'dist-electron',
                    rollupOptions: {
                      external: ['electron'],
                    },
                  },
                },
              },
            }),
          ]),
      TanStackRouterVite({
        target: 'react',
        autoCodeSplitting: true,
        routesDirectory: './src/routes',
        generatedRouteTree: './src/routeTree.gen.ts',
      }),
      tailwindcss(),
      react(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: process.env.HOST || '0.0.0.0',
      port: parseInt(process.env.TEST_PORT || '3007', 10),
      allowedHosts: true,
      proxy: {
        '/api': {
          target: env.VITE_SERVER_URL || 'http://localhost:3008',
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: shouldGenerateSourcemap,
      minify: isProduction || isStaging ? 'terser' : false,
      emptyOutDir: true,
      rollupOptions: {
        external: [
          'child_process',
          'fs',
          'path',
          'crypto',
          'http',
          'net',
          'os',
          'util',
          'stream',
          'events',
          'readline',
        ],
        output:
          isJunoBuild && isProduction
            ? {
                // Optimize chunks for ICP asset canister
                manualChunks: {
                  vendor: ['react', 'react-dom'],
                  router: ['@tanstack/react-router', '@tanstack/react-query'],
                  ui: [
                    '@radix-ui/react-dialog',
                    '@radix-ui/react-dropdown-menu',
                    '@radix-ui/react-tabs',
                    '@radix-ui/react-tooltip',
                  ],
                  editor: ['@uiw/react-codemirror', '@codemirror/*'],
                },
                // Ensure proper file naming for caching
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: (assetInfo) => {
                  const info = assetInfo.name || '';
                  if (info.endsWith('.css')) {
                    return 'assets/[name]-[hash][extname]';
                  }
                  if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(info)) {
                    return 'assets/images/[name]-[hash][extname]';
                  }
                  if (/\.(woff2?|ttf|otf|eot)$/.test(info)) {
                    return 'assets/fonts/[name]-[hash][extname]';
                  }
                  return 'assets/[name]-[hash][extname]';
                },
              }
            : undefined,
      },
    },
    optimizeDeps: {
      exclude: ['@automaker/platform'],
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_ENV__: JSON.stringify(junoEnv),
      __APP_MODE__: JSON.stringify(env.VITE_APP_MODE || junoEnv),
      __JUNO_BUILD__: JSON.stringify(isJunoBuild),
      'process.env.VITE_SERVER_URL': JSON.stringify(env.VITE_SERVER_URL || 'http://localhost:3008'),
      'process.env.VITE_APP_ENV': JSON.stringify(env.VITE_APP_ENV || junoEnv),
    },
  };
});
