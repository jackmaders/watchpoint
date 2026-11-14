/**
 * Test entry point for `@cloudflare/vitest-plugin` worker pool. Prevents the test runner from
 * attempting to load the production TanStack Start SSR entry.
 */
const emptyWorker = {};

// eslint-disable-next-line import/no-default-export
export default emptyWorker;
