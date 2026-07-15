/**
 * Mock data layer — the mobile stand-in for the backend.
 *
 * queries.ts mirrors the web's lib/queries (reads), actions.ts mirrors
 * lib/actions (writes). Backend integration replaces the internals of these
 * modules with API calls; their signatures are the contract.
 */

export { subscribeToDb, resetDb } from './db';

export * from './queries';
export * from './actions';

export { FLAT_BLOCK_FLAVOURS } from './config';
