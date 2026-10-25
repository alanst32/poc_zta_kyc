import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The deployed-stack suites mutate shared DynamoDB state (risk flips, revocations),
    // so files and tests run strictly one after another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
