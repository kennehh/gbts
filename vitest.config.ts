import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        pool: "threads",
        include: ["./tests/**/*.test.ts"],
    },
    resolve: {
        alias: {
            "@": new URL("./src/", import.meta.url).pathname,
        },
    },
});
