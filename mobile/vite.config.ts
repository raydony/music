import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.DEV_API_TARGET;

  if (command === 'serve' && mode !== 'test' && !target) {
    throw new Error('缺少 DEV_API_TARGET：请复制 mobile/.env.example 为 mobile/.env.local');
  }

  return {
    plugins: [react()],
    base: '/',
    server: {
      port: 5174,
      strictPort: true,
      proxy: target ? { '/api': { target, changeOrigin: true } } : undefined,
    },
  };
});
