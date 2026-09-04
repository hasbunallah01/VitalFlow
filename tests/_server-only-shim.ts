/**
 * Test shim for the `server-only` marker package.
 *
 * The real package throws at import time when bundled into a Client
 * Component. In a Node test environment there's no Client Component,
 * so we just need an empty module that does nothing.
 */
export {};
