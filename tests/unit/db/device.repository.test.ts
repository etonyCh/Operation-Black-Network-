import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Database } from '@main/db/database'
import { SessionRepository } from '@main/db/repositories/session.repository'
import { DeviceRepository } from '@main/db/repositories/device.repository'
import type { Device } from '@shared/types/device.types'

describe('DeviceRepository', () => {
  let sessionRepo: SessionRepository
  let deviceRepo: DeviceRepository
  let sessionId: string

  beforeEach(() => {
    const db = Database.getInstance()
    if (db.isOpen) db.close()
    db.initialize(':memory:')
    sessionRepo = new SessionRepository()
    deviceRepo = new DeviceRepository()
    const session = sessionRepo.create({ name: 'Test Session', target: '192.168.1.0/24' })
    sessionId = session.id
  })

  afterEach(() => {
    Database.getInstance().close()
  })

  function makeDevice(ip: string, overrides?: Partial<Device>): Device {
    return {
      id: crypto.randomUUID(),
      sessionId,
      ip,
      deviceType: 'unknown',
      status: 'online',
      discoveredAt: Date.now(),
      lastSeen: Date.now(),
      ...overrides,
    }
  }

  // ---------------------------------------------------------------------------
  // upsert() — insert path
  // ---------------------------------------------------------------------------

  describe('upsert() — insert', () => {
    it('saves a minimal device and returns the correct fields', () => {
      const device = makeDevice('192.168.1.1')
      const result = deviceRepo.upsert(device)

      expect(result.id).toBe(device.id)
      expect(result.sessionId).toBe(sessionId)
      expect(result.ip).toBe('192.168.1.1')
      expect(result.deviceType).toBe('unknown')
      expect(result.status).toBe('online')
      expect(result.ports).toBeUndefined()
      expect(result.os).toBeUndefined()
    })

    it('persists all optional scalar fields', () => {
      const device = makeDevice('192.168.1.2', {
        mac: 'aa:bb:cc:dd:ee:ff',
        hostname: 'router.local',
        vendor: 'Cisco',
        deviceType: 'router',
        responseTime: 8,
      })
      const result = deviceRepo.upsert(device)

      expect(result.mac).toBe('aa:bb:cc:dd:ee:ff')
      expect(result.hostname).toBe('router.local')
      expect(result.vendor).toBe('Cisco')
      expect(result.deviceType).toBe('router')
      expect(result.responseTime).toBe(8)
    })

    it('serializes ports array to JSON and deserializes correctly on read', () => {
      const ports = [
        { port: 80, protocol: 'tcp' as const, state: 'open' as const, service: 'http' },
        { port: 443, protocol: 'tcp' as const, state: 'open' as const, service: 'https' },
      ]
      const device = makeDevice('192.168.1.3', { ports })
      deviceRepo.upsert(device)

      // Re-fetch from DB to verify JSON round-trip
      const found = deviceRepo.findById(device.id)!
      expect(found.ports).toHaveLength(2)
      expect(found.ports![0].port).toBe(80)
      expect(found.ports![0].protocol).toBe('tcp')
      expect(found.ports![0].service).toBe('http')
      expect(found.ports![1].port).toBe(443)
      expect(found.ports![1].service).toBe('https')
    })

    it('serializes os (OSMatch) to JSON and deserializes correctly on read', () => {
      const os = {
        name: 'Linux 5.x',
        accuracy: 95,
        family: 'Linux',
        vendor: 'Linux',
        cpe: ['cpe:/o:linux:linux_kernel:5'],
      }
      const device = makeDevice('192.168.1.4', { os })
      deviceRepo.upsert(device)

      const found = deviceRepo.findById(device.id)!
      expect(found.os).not.toBeUndefined()
      expect(found.os!.name).toBe('Linux 5.x')
      expect(found.os!.accuracy).toBe(95)
      expect(found.os!.family).toBe('Linux')
      expect(found.os!.vendor).toBe('Linux')
      expect(found.os!.cpe).toEqual(['cpe:/o:linux:linux_kernel:5'])
    })
  })

  // ---------------------------------------------------------------------------
  // upsert() — update path (same session_id + ip)
  // ---------------------------------------------------------------------------

  describe('upsert() — update (same session + IP)', () => {
    it('updates an existing device instead of inserting a duplicate', () => {
      const original = makeDevice('10.0.0.1', { hostname: 'old-host', status: 'online' })
      deviceRepo.upsert(original)

      // Different id, same session + IP → should update the existing row
      const newer = makeDevice('10.0.0.1', {
        id: crypto.randomUUID(),
        hostname: 'new-host',
        status: 'offline',
      })
      const result = deviceRepo.upsert(newer)

      // Returns the record with the ORIGINAL id (existing row)
      expect(result.id).toBe(original.id)
      expect(result.hostname).toBe('new-host')
      expect(result.status).toBe('offline')
    })

    it('leaves only one row in the DB after an upsert on the same IP', () => {
      deviceRepo.upsert(makeDevice('10.0.0.2'))
      deviceRepo.upsert(makeDevice('10.0.0.2', { id: crypto.randomUUID() }))

      expect(deviceRepo.findBySessionId(sessionId)).toHaveLength(1)
    })

    it('updates ports during an upsert update', () => {
      const original = makeDevice('10.0.0.3')
      deviceRepo.upsert(original)

      const ports = [{ port: 22, protocol: 'tcp' as const, state: 'open' as const }]
      const updated = makeDevice('10.0.0.3', { id: crypto.randomUUID(), ports })
      const result = deviceRepo.upsert(updated)

      expect(result.ports).toHaveLength(1)
      expect(result.ports![0].port).toBe(22)
    })
  })

  // ---------------------------------------------------------------------------
  // findBySessionId()
  // ---------------------------------------------------------------------------

  describe('findBySessionId()', () => {
    it('returns an empty array when no devices exist for the session', () => {
      expect(deviceRepo.findBySessionId(sessionId)).toEqual([])
    })

    it('returns all devices for the session ordered by IP (lexicographic)', () => {
      deviceRepo.upsert(makeDevice('10.0.0.2'))
      deviceRepo.upsert(makeDevice('10.0.0.1'))
      deviceRepo.upsert(makeDevice('10.0.0.3'))

      const devices = deviceRepo.findBySessionId(sessionId)
      expect(devices).toHaveLength(3)
      expect(devices[0].ip).toBe('10.0.0.1')
      expect(devices[1].ip).toBe('10.0.0.2')
      expect(devices[2].ip).toBe('10.0.0.3')
    })

    it('does not return devices belonging to a different session', () => {
      const otherSession = sessionRepo.create({ name: 'Other Session' })

      deviceRepo.upsert(makeDevice('1.1.1.1'))
      deviceRepo.upsert(makeDevice('2.2.2.2', { sessionId: otherSession.id }))

      const devices = deviceRepo.findBySessionId(sessionId)
      expect(devices).toHaveLength(1)
      expect(devices[0].ip).toBe('1.1.1.1')
    })
  })

  // ---------------------------------------------------------------------------
  // findById()
  // ---------------------------------------------------------------------------

  describe('findById()', () => {
    it('returns the correct device for an existing ID', () => {
      const device = makeDevice('172.16.0.1', { hostname: 'gateway', deviceType: 'router' })
      deviceRepo.upsert(device)

      const found = deviceRepo.findById(device.id)
      expect(found).not.toBeNull()
      expect(found!.ip).toBe('172.16.0.1')
      expect(found!.hostname).toBe('gateway')
      expect(found!.deviceType).toBe('router')
    })

    it('returns null for a non-existent ID', () => {
      expect(deviceRepo.findById('ghost-device-id')).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // update()
  // ---------------------------------------------------------------------------

  describe('update()', () => {
    it('updates status field', () => {
      const device = makeDevice('192.168.0.10', { status: 'online' })
      deviceRepo.upsert(device)

      const result = deviceRepo.update(device.id, { status: 'offline' })
      expect(result).not.toBeNull()
      expect(result!.status).toBe('offline')
    })

    it('updates hostname field', () => {
      const device = makeDevice('192.168.0.11', { hostname: 'old-name' })
      deviceRepo.upsert(device)

      const result = deviceRepo.update(device.id, { hostname: 'new-name' })
      expect(result!.hostname).toBe('new-name')
    })

    it('updates ports via update()', () => {
      const device = makeDevice('192.168.0.20')
      deviceRepo.upsert(device)

      const ports = [{ port: 22, protocol: 'tcp' as const, state: 'open' as const, service: 'ssh' }]
      const result = deviceRepo.update(device.id, { ports })
      expect(result!.ports).toHaveLength(1)
      expect(result!.ports![0].port).toBe(22)
      expect(result!.ports![0].service).toBe('ssh')
    })

    it('does not lose unchanged DB fields when only one field is updated', () => {
      const device = makeDevice('192.168.0.30', { vendor: 'Dell', deviceType: 'server' })
      deviceRepo.upsert(device)

      const result = deviceRepo.update(device.id, { status: 'offline' })
      expect(result!.vendor).toBe('Dell')
      expect(result!.deviceType).toBe('server')
      expect(result!.ip).toBe('192.168.0.30')
    })

    it('returns null for a non-existent ID', () => {
      const result = deviceRepo.update('ghost-id', { status: 'offline' })
      expect(result).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // deleteBySessionId()
  // ---------------------------------------------------------------------------

  describe('deleteBySessionId()', () => {
    it('removes all devices for the given session', () => {
      deviceRepo.upsert(makeDevice('192.168.1.10'))
      deviceRepo.upsert(makeDevice('192.168.1.11'))
      deviceRepo.upsert(makeDevice('192.168.1.12'))

      deviceRepo.deleteBySessionId(sessionId)

      expect(deviceRepo.findBySessionId(sessionId)).toHaveLength(0)
    })

    it('does not affect devices in a different session', () => {
      const other = sessionRepo.create({ name: 'Other' })

      deviceRepo.upsert(makeDevice('10.0.0.1'))
      deviceRepo.upsert(makeDevice('10.0.0.2', { sessionId: other.id }))

      deviceRepo.deleteBySessionId(sessionId)

      expect(deviceRepo.findBySessionId(other.id)).toHaveLength(1)
      expect(deviceRepo.findBySessionId(sessionId)).toHaveLength(0)
    })

    it('is a no-op when the session has no devices', () => {
      expect(() => deviceRepo.deleteBySessionId(sessionId)).not.toThrow()
    })
  })
})
