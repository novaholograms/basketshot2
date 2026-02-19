import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      optimizeDeps: {
        include: [
          '@revenuecat/purchases-capacitor-ui',
          '@revenuecat/purchases-capacitor',
          '@revenuecat/purchases-typescript-internal-esm'
        ],
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@revenuecat/purchases-capacitor-ui': path.resolve(
            __dirname,
            'node_modules/@revenuecat/purchases-capacitor-ui/dist/esm/index.js'
          ),
        }
      }
    };
});
