import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        // execArgv: [
        //   '--cpu-prof',
        //   '--cpu-prof-dir=test-runner-profile',
        //   '--heap-prof',
        //   '--heap-prof-dir=test-runner-profile'
        // ],
    
        // To generate a single profile
        // singleFork: true,
        },
    },
  }
});

