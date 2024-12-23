import type { UserConfig } from 'vite'

export default {
    base: '/gbts/',
    build: {
        target: 'esnext',        
        minify: 'esbuild'
    }
} satisfies UserConfig