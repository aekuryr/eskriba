import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/eskriba/',   // ← ✅ nombre exacto del repo en GitHub
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});