import assert from 'node:assert/strict'
import test from 'node:test'

import { appendTranscript } from '../src/lib/voice-transcription.ts'

test('uses a transcript as the initial report text', () => {
  assert.equal(appendTranscript('', '  Meu relato  '), 'Meu relato')
})

test('appends speech without removing manually entered text', () => {
  assert.equal(appendTranscript('Texto digitado', 'fala reconhecida'), 'Texto digitado. fala reconhecida')
})

test('does not duplicate punctuation between manual and spoken text', () => {
  assert.equal(appendTranscript('Texto digitado!', 'fala reconhecida'), 'Texto digitado! fala reconhecida')
})
