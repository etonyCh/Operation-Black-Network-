import BetterSqlite3 from 'better-sqlite3'
import type { Database as SQLiteDB } from 'better-sqlite3'
import { SCHEMA_SQL } from './schema'
import { logger } from '@main/utils/logger'

export class Database {
  private static instance: Database
  private db: SQLiteDB | null = null

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  initialize(dbPath: string): void {
    if (this.db) {
      logger.warn('Database already initialized')
      return
    }
    try {
      this.db = new BetterSqlite3(dbPath)
      // Enable WAL and foreign keys (also declared in schema, but set here for safety)
      this.db.pragma('journal_mode = WAL')
      this.db.pragma('foreign_keys = ON')
      this.db.exec(SCHEMA_SQL)
      logger.info(`Database ready: ${dbPath}`)
    } catch (err) {
      logger.error(`Database initialization failed: ${err}`)
      throw err
    }
  }

  /** Returns the open database. Throws if initialize() was not called first. */
  getDb(): SQLiteDB {
    if (!this.db) throw new Error('Database not initialized — call initialize() first')
    return this.db
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      logger.info('Database closed')
    }
  }

  get isOpen(): boolean {
    return this.db?.open ?? false
  }
}
