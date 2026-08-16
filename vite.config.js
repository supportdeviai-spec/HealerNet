import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        origin: 'http://localhost:5173',
        cors: true,
        proxy: {
            '/api': {
                target: process.env.VITE_API_URL || 'http://web:80',
                changeOrigin: true,
            },
            '/banner': {
                target: process.env.VITE_API_URL || 'http://web:80',
                changeOrigin: true,
            },
            '/storage': {
                target: process.env.VITE_API_URL || 'http://web:80',
                changeOrigin: true,
            },
            '/images': {
                target: process.env.VITE_API_URL || 'http://web:80',
                changeOrigin: true,
            },
        },
        hmr: {
            host: 'localhost',
            protocol: 'ws',
            clientPort: 5173,
        },
        watch: {
            usePolling: true,
            interval: 1000,
            ignored: [
                '**/node_modules/**',
                '**/vendor/**',
                '**/storage/**',
                '**/public/build/**',
                '**/.git/**',
            ],
        },
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'lucide-react', 'recharts'],
    },
    build: {
        target: 'es2020',
        cssCodeSplit: true,
        sourcemap: false,
        chunkSizeWarningLimit: 700,
    },
});
