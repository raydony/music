import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  base: command === 'build' || mode === 'production' ? '/admin/' : '/',
}));
