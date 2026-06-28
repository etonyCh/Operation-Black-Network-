import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Database } from '@main/db/database'
import { SessionRepository } from '@main/db/repositories/session.repository'

describe('SessionRepository', () => {
  let repo: SessionRepository

  beforeEach(() => {
    const db = Database.getInstance()
    if (db.isOpen) db.close()
    db.initialize(':memory:')
    repo = new SessionRepository()
  })

  afterEach(() => {
    Database.getInstance().close()
  })

  // ---------------------------------------------------------------------------
  // create()
  // ---------------------------------------------------------------------------

  describe('create()', () => {
    it('creates a session with only a name', () => {
      const session = repo.create({ name: 'Minimal Session' })

      expect(session.id).toBeDefined()
      expect(session.name).toBe('Minimal Session')
      expect(session.target).toBeUndefined()
      expect(session.notes).toBeUndefined()
      expect(session.riskScore).toBeUndefined()
      expect(typeof session.createdAt).toBe('number')
      expect(typeof session.updatedAt).toBe('number')
    })

    it('creates a session with all fields', () => {
      const session = repo.create({
        name: 'Full Session',
        target: '192.168.1.0/24',
        notes: 'Pentest notes',
      })

      expect(session.name).toBe('Full Session')
      expect(session.target).toBe('192.168.1.0/24')
      expect(session.notes).toBe('Pentest notes')
    })

    it('assigns unique IDs to each session', () => {
      const s1 = repo.create({ name: 'Session A' })
      const s2 = repo.create({ name: 'Session B' })

      expect(s1.id).not.toBe(s2.id)
    })

    it('persists the session so findById returns it', () => {
      const created = repo.create({ name: 'Persisted' })
      const fetched = repo.findById(created.id)

      expect(fetched).not.toBeNull()
      expect(fetched!.name).toBe('Persisted')
    })
  })

  // ---------------------------------------------------------------------------
  // findAll()
  // ---------------------------------------------------------------------------

  describe('findAll()', () => {
    it('returns an empty array when no sessions exist', () => {
      expect(repo.findAll()).toEqual([])
    })

    it('returns all sessions sorted by createdAt DESC', async () => {
      const s1 = repo.create({ name: 'First' })
      await new Promise(r => setTimeout(r, 5))
      const s2 = repo.create({ name: 'Second' })
      await new Promise(r => setTimeout(r, 5))
      const s3 = repo.create({ name: 'Third' })

      const all = repo.findAll()
      expect(all).toHaveLength(3)
      // Newest first
      expect(all[0].id).toBe(s3.id)
      expect(all[1].id).toBe(s2.id)
      expect(all[2].id).toBe(s1.id)
    })
  })

  // ---------------------------------------------------------------------------
  // findById()
  // ---------------------------------------------------------------------------

  describe('findById()', () => {
    it('returns the correct session for an existing ID', () => {
      const created = repo.create({ name: 'Lookup', target: '10.0.0.0/8' })
      const found = repo.findById(created.id)

      expect(found).not.toBeNull()
      expect(found!.id).toBe(created.id)
      expect(found!.name).toBe('Lookup')
      expect(found!.target).toBe('10.0.0.0/8')
    })

    it('returns null for a non-existent ID', () => {
      expect(repo.findById('does-not-exist')).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // update()
  // ---------------------------------------------------------------------------

  describe('update()', () => {
    it('updates name and notes while leaving other fields unchanged', () => {
      const created = repo.create({ name: 'Old Name', target: '192.168.0.0/16' })

      const updated = repo.update(created.id, { name: 'New Name', notes: 'Added notes' })

      expect(updated).not.toBeNull()
      expect(updated!.name).toBe('New Name')
      expect(updated!.notes).toBe('Added notes')
      // target was not included in the update — should still be present
      expect(updated!.target).toBe('192.168.0.0/16')
    })

    it('updates riskScore', () => {
      const created = repo.create({ name: 'Risk Session' })

      const updated = repo.update(created.id, { riskScore: 8.5 })

      expect(updated!.riskScore).toBe(8.5)
    })

    it('bumps updatedAt after update', async () => {
      const created = repo.create({ name: 'Timestamp Test' })
      await new Promise(r => setTimeout(r, 5))

      const updated = repo.update(created.id, { name: 'Changed' })

      expect(updated!.updatedAt).toBeGreaterThan(created.updatedAt)
    })

    it('returns null for a non-existent ID', () => {
      const result = repo.update('ghost-id', { name: 'Ghost' })
      expect(result).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // delete()
  // ---------------------------------------------------------------------------

  describe('delete()', () => {
    it('returns true when deleting an existing session', () => {
      const session = repo.create({ name: 'To Delete' })
      expect(repo.delete(session.id)).toBe(true)
    })

    it('removes the session so findById returns null', () => {
      const session = repo.create({ name: 'Gone' })
      repo.delete(session.id)

      expect(repo.findById(session.id)).toBeNull()
    })

    it('returns false for a non-existent ID', () => {
      expect(repo.delete('ghost-id')).toBe(false)
    })

    it('decrements findAll() result after deletion', () => {
      const s1 = repo.create({ name: 'Keep' })
      const s2 = repo.create({ name: 'Remove' })

      repo.delete(s2.id)

      const all = repo.findAll()
      expect(all).toHaveLength(1)
      expect(all[0].id).toBe(s1.id)
    })
  })

  // ---------------------------------------------------------------------------
  // getSetting() / setSetting()
  // ---------------------------------------------------------------------------

  describe('getSetting() / setSetting()', () => {
    it('returns null for a key that has never been set', () => {
      expect(repo.getSetting('nonexistent-key')).toBeNull()
    })

    it('stores and retrieves a setting by key', () => {
      repo.setSetting('theme', 'dark')
      expect(repo.getSetting('theme')).toBe('dark')
    })

    it('updates an existing key (INSERT OR REPLACE is idempotent)', () => {
      repo.setSetting('apiKey', 'v1-secret')
      repo.setSetting('apiKey', 'v2-secret')
      expect(repo.getSetting('apiKey')).toBe('v2-secret')
    })

    it('stores multiple independent keys without interference', () => {
      repo.setSetting('key-a', 'alpha')
      repo.setSetting('key-b', 'beta')

      expect(repo.getSetting('key-a')).toBe('alpha')
      expect(repo.getSetting('key-b')).toBe('beta')
    })
  })

  // ---------------------------------------------------------------------------
  // Aggregate helpers (zero-count baseline)
  // ---------------------------------------------------------------------------

  describe('getDeviceCount()', () => {
    it('returns 0 for a session with no devices', () => {
      const session = repo.create({ name: 'Empty' })
      expect(repo.getDeviceCount(session.id)).toBe(0)
    })
  })

  describe('getVulnCount()', () => {
    it('returns 0 for a session with no vulnerabilities', () => {
      const session = repo.create({ name: 'Empty' })
      expect(repo.getVulnCount(session.id)).toBe(0)
    })
  })

  describe('getMaxRiskScore()', () => {
    it('returns 0 when the session has no vulnerabilities', () => {
      const session = repo.create({ name: 'Empty' })
      expect(repo.getMaxRiskScore(session.id)).toBe(0)
    })
  })
})
