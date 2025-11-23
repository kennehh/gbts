import type { UserConfig } from 'vite'
import { analyzer } from 'vite-bundle-analyzer'

export default {
    plugins: [ analyzer() ],
    base: '/gbts/',
    build: {
        target: 'esnext',        
        minify: 'terser'
    },
    worker: {
        format: "es"
    }
} satisfies UserConfig