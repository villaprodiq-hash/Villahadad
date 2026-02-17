import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    plugins: [react(), tailwindcss()],
    build: {
      outDir: env.VITE_APP_TARGET ? `dist-${env.VITE_APP_TARGET}` : 'dist',
      chunkSizeWarningLimit: 1000, // تم رفع الحد قليلاً لتجنب التحذيرات البسيطة
      rollupOptions: {
        // الحفاظ على استثناء مكتبات الإلكترون
        external: ['better-sqlite3', 'electron-store'],
        output: {
          // 🔥 هنا السحر: تقسيم الملفات الكبيرة
          manualChunks: (id) => {
            // 1. فصل مكتبات React الأساسية
            if (id.includes('node_modules/react') || 
                id.includes('node_modules/react-dom') || 
                id.includes('node_modules/react-router-dom')) {
              return 'vendor-react';
            }
            // 2. فصل Supabase (لأنها ثقيلة)
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }

            // 4. فصل مكتبات الواجهة (Framer Motion, Lucide, Radix)
            if (id.includes('framer-motion') || 
                id.includes('lucide-react') || 
                id.includes('@radix-ui')) {
              return 'vendor-ui';
            }
            // 5. فصل معالجة الفيديو (إذا كانت موجودة)
            if (id.includes('@ffmpeg')) {
              return 'vendor-ffmpeg';
            }
            // 6. فصل أدوات التاريخ والوقت
            if (id.includes('date-fns') || id.includes('dayjs')) {
              return 'vendor-utils';
            }
          },
        },
      },
    },
    define: {
      'process.env.VITE_APP_TARGET': JSON.stringify(env.VITE_APP_TARGET),
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_DB_HOST': JSON.stringify(env.VITE_DB_HOST),
      'import.meta.env.VITE_DB_PORT': JSON.stringify(env.VITE_DB_PORT),
      'import.meta.env.VITE_DB_USER': JSON.stringify(env.VITE_DB_USER),
      'import.meta.env.VITE_DB_PASS': JSON.stringify(env.VITE_DB_PASS),
      'import.meta.env.VITE_DB_NAME': JSON.stringify(env.VITE_DB_NAME),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'node',
      globals: true,
      setupFiles: ['./src/tests/vitest.setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
      exclude: [
        'tests/**',
        'node_modules/**',
        '.opencode/**',
        'dist/**',
        'release/**',
      ],
    },
  };
});
