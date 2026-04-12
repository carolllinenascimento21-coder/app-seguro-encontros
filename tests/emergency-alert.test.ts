import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ALERT_COOLDOWN_MS,
  buildEmergencyLog,
  computeSmsTargets,
  isWithinCooldown,
  MAX_CONTACTS_PER_ALERT,
  sanitizeContactsForAlert,
} from '../src/lib/emergency-alert.ts'

test('rate limiting blocks alerts inside 2-minute window', () => {
  const now = Date.now()
  const oneMinuteAgo = new Date(now - 60_000).toISOString()

  assert.equal(isWithinCooldown(oneMinuteAgo, now, ALERT_COOLDOWN_MS), true)
})

test('rate limiting allows alerts after cooldown', () => {
  const now = Date.now()
  const threeMinutesAgo = new Date(now - 180_000).toISOString()

  assert.equal(isWithinCooldown(threeMinutesAgo, now, ALERT_COOLDOWN_MS), false)
})

test('contact sanitization enforces maximum of 3 valid contacts', () => {
  const contacts = [
    { telefone: '+5511999990001' },
    { telefone: '+5511999990002' },
    { telefone: '+5511999990003' },
    { telefone: '+5511999990004' },
  ]

  const sanitized = sanitizeContactsForAlert(contacts)

  assert.equal(sanitized.length, MAX_CONTACTS_PER_ALERT)
  assert.deepEqual(
    sanitized.map((item) => item.telefoneE164),
    ['+5511999990001', '+5511999990002', '+5511999990003']
  )
})

test('sms fallback sends only to whatsapp failures when configured', () => {
  const contacts = [
    { telefoneE164: '+5511999990001', telefoneOriginal: '+5511999990001' },
    { telefoneE164: '+5511999990002', telefoneOriginal: '+5511999990002' },
  ]

  const targets = computeSmsTargets({
    contacts,
    whatsappConfigured: true,
    whatsappSentTo: new Set(['+5511999990001']),
  })

  assert.deepEqual(targets.map((target) => target.telefoneE164), ['+5511999990002'])
})

test('logging payload has expected production structure', () => {
  const payload = buildEmergencyLog({
    userId: '11111111-1111-1111-1111-111111111111',
    contactsCount: 3,
    channelsUsed: ['push', 'sms'],
    status: 'success',
  })

  assert.deepEqual(payload, {
    user_id: '11111111-1111-1111-1111-111111111111',
    contacts_count: 3,
    channels_used: ['push', 'sms'],
    status: 'success',
  })
})
