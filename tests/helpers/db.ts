import BetterSqlite3 from 'better-sqlite3'
// Import Database but we'll use type casting to reset the singleton
import { Database } from '@main/db/database'

/**
 * Initialize a fresh in-memory SQLite database for testing.
 * Safe to call multiple times — closes and reinitializes.
 */
export function initTestDb(): void {
  const db = Database.getInstance()
  if (db.isOpen) db.close()
  db.initialize(':memory:')
}

/**
 * Close and destroy the test database.
 */
export function closeTestDb(): void {
  const db = Database.getInstance()
  if (db.isOpen) db.close()
}
