import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // 加載環境變量，確保 env 變量可用
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // 確保路徑完全對應你的 GitHub 倉庫名稱與資料夾
    base: '/ANSUN/forex-&-commodity-position-calculator/',
    
    plugins: [
      react(),
      tailwindcss()
    ],

    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      // HMR 邏輯保留
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
