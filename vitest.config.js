import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["backend/tests/**/*.test.js"],
    setupFiles: ["./backend/tests/setup.js"],
    // Vitest 4: poolOptions flattened to top-level
    pool: "forks",
    fileParallelism: false, // run test files one at a time to avoid DB races
    testTimeout: 15000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: "test",
    },
  },
});
