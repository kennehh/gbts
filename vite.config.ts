import { defineConfig } from "vite";
import { analyzer } from 'vite-bundle-analyzer'

export default defineConfig({
    plugins: [ analyzer() ],
    base: '/gbts/',
    build: {
        target: 'esnext',        
        minify: 'terser'
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
