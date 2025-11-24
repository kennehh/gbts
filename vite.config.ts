import { defineConfig } from "vite";
import { analyzer } from 'vite-bundle-analyzer'

export default defineConfig({
    plugins: [ analyzer() ],
    base: '/gbts/',
    build: {
        target: 'esnext',        
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
                ecma: 2020,
                passes: 3,
                pure_getters: true,
                pure_new: true
            },
            mangle: true
        }
    },
    resolve: {
        alias: {
            "@": new URL('./src/', import.meta.url).pathname, 
        }
    },
    worker: {
        format: "es"
    }
});
