import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Database } from '@main/db/database'
import { sotaService } from '@main/services/sota.service'

describe('SotaService', () => {
  beforeEach(() => {
    const db = Database.getInstance()
    if (db.isOpen) db.close()
    db.initialize(':memory:')
  })

  afterEach(() => {
    Database.getInstance().close()
  })

  describe('validateActionWithPddl()', () => {
    it('allows isolating non-gateway IPs', () => {
      const result = sotaService.validateActionWithPddl('isolate-system', '192.168.1.5', '192.168.1.1')
      expect(result.isValid).toBe(true)
      expect(result.ruleViolated).toBeUndefined()
      expect(result.explanations).toContain("L'action d'isolement a été validée")
    })

    it('blocks isolating gateway IP', () => {
      const result = sotaService.validateActionWithPddl('isolate-system', '192.168.1.1', '192.168.1.1')
      expect(result.isValid).toBe(false)
      expect(result.ruleViolated).toBe('PRECONDITION_VIOLATION: Cannot isolate default gateway')
      expect(result.explanations).toContain('bloquée par le planificateur PDDL')
    })

    it('allows patching non-gateway IPs', () => {
      const result = sotaService.validateActionWithPddl('patch-system', '192.168.1.10', '192.168.1.1')
      expect(result.isValid).toBe(true)
      expect(result.ruleViolated).toBeUndefined()
    })

    it('blocks patching gateway IP directly', () => {
      const result = sotaService.validateActionWithPddl('patch-system', '192.168.1.1', '192.168.1.1')
      expect(result.isValid).toBe(false)
      expect(result.ruleViolated).toBe('SAFETY_VIOLATION: Cannot patch default gateway live')
    })
  })

  describe('analyzePqcStatus()', () => {
    it('classifies port 22 (SSH) as vulnerable and recommends Kyber', () => {
      const status = sotaService.analyzePqcStatus(22, 'ssh')
      expect(status.isQuantumReady).toBe(false)
      expect(status.riskLevel).toBe('high')
      expect(status.algorithmsFound).toContain('ssh-rsa (2048-bit)')
      expect(status.recommendations.some(r => r.includes('Kyber768'))).toBe(true)
    })

    it('classifies port 443 (HTTPS) as vulnerable and recommends ML-KEM', () => {
      const status = sotaService.analyzePqcStatus(443, 'https')
      expect(status.isQuantumReady).toBe(false)
      expect(status.riskLevel).toBe('high')
      expect(status.recommendations.some(r => r.includes('ML-KEM'))).toBe(true)
    })

    it('classifies database ports (MySQL/Postgres) as quantum ready at rest but low risk', () => {
      const status = sotaService.analyzePqcStatus(3306, 'mysql')
      expect(status.isQuantumReady).toBe(true)
      expect(status.riskLevel).toBe('low')
    })

    it('classifies non-encrypted services as safe / none risk by default', () => {
      const status = sotaService.analyzePqcStatus(80, 'http')
      expect(status.isQuantumReady).toBe(true)
      expect(status.riskLevel).toBe('none')
    })
  })

  describe('Agent Audit Logs & Database Persistence', () => {
    it('stores and retrieves agent audit logs correctly', () => {
      sotaService.logAgentAction(
        'Test_Agent',
        'TestAction',
        'TestInput',
        'TestOutput',
        1,
        'NoRule'
      )

      const logs = sotaService.getAgentAuditLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].agentId).toBe('Test_Agent')
      expect(logs[0].action).toBe('TestAction')
      expect(logs[0].input).toBe('TestInput')
      expect(logs[0].output).toBe('TestOutput')
      expect(logs[0].pddlValid).toBe(1)
    })

    it('triggers CTEM simulations and logs results in SQLite', async () => {
      const sim = await sotaService.runCtemSimulation('arp-spoof', '192.168.1.10')
      expect(sim.success).toBe(true)
      expect(sim.message).toContain("Audit d'interception ARP lancé")

      const logs = sotaService.getAgentAuditLogs()
      expect(logs.length).toBeGreaterThanOrEqual(2)
      
      const l2Log = logs.find(l => l.agentId === 'Agent_L2_Remediation')
      expect(l2Log).toBeDefined()
      expect(l2Log!.pddlValid).toBe(1) // target is not gateway (.1)
      
      const l1Log = logs.find(l => l.agentId === 'Agent_L1_Triage')
      expect(l1Log).toBeDefined()
    })

    it('blocks simulated actions under PDDL safety rules', async () => {
      // Simulate ARP spoof against the gateway (which will trigger isolation, blocked by PDDL rule)
      const sim = await sotaService.runCtemSimulation('arp-spoof', '192.168.1.1')
      expect(sim.success).toBe(true)
      expect(sim.message).toContain('PDDL')
      expect(sim.message).toContain('passerelle')

      const logs = sotaService.getAgentAuditLogs()
      const l2Log = logs.find(l => l.agentId === 'Agent_L2_Remediation')
      expect(l2Log).toBeDefined()
      expect(l2Log!.pddlValid).toBe(0) // blocked!
      expect(l2Log!.pddlRule).toBe('PRECONDITION_VIOLATION: Cannot isolate default gateway')
    })
  })
})
