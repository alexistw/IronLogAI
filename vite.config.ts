import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // No provider API key is ever bundled into the app. The client only
        // knows the proxy URL; the worker holds the keys and picks the vendor.
        'process.env.AI_PROXY_URL': JSON.stringify(env.AI_PROXY_URL ?? ''),
        // Optional shared header. Obfuscation only — it ships in the bundle.
        'process.env.AI_APP_KEY': JSON.stringify(env.AI_APP_KEY ?? ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
