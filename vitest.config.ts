import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    pool: 'threads',  // Use 'threads' or 'forks'
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: false
      }
    }
  }
});

