// Migration 001 — initial schema
// The full DDL lives in schema.ts and is applied by Database.initialize().
// This file acts as a changelog entry for tooling / future migration runners.

export const version = 1
export const description =
  'Initial schema: sessions, devices, vulnerabilities, traffic, proxy, settings'
export const appliedAt = new Date('2024-01-01').getTime()
