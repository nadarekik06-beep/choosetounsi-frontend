// node --test scripts/test-chat-dir.mjs
// Arabizi, French and English chat text is LTR; only Arabic-script text is RTL.
import test from 'node:test'
import assert from 'node:assert/strict'
import { textDir } from '../lib/chatDir.ts'

test('Arabizi is LTR', () => {
  assert.equal(textDir("Ahla w sahla! 👋 Ena l'assistant mta3 Choose'Tounsi. 9olli chnowa tlawej, w kan t7eb zid el budget"), 'ltr')
  assert.equal(textDir('Kifech nkhallas?'), 'ltr')
  assert.equal(textDir('Akther fel sbabet lel nsa'), 'ltr')
  assert.equal(textDir('Couleur o5ra'), 'ltr')
})

test('French and English are LTR', () => {
  assert.equal(textDir('Bonjour ! Je suis là pour vous aider.'), 'ltr')
  assert.equal(textDir("Hi! I'm here to help."), 'ltr')
  assert.equal(textDir(''), 'ltr')
})

test('Arabic script is RTL, even with a Latin product name inside', () => {
  assert.equal(textDir('أهلا وسهلا! أنا المساعد متاع Choose\'Tounsi'), 'rtl')
  assert.equal(textDir('أرخص'), 'rtl')
  assert.equal(textDir('لقيتلك 5 سباط لصاحبتك. نقترحلك "Sandale femme" (44 د.ت).'), 'rtl')
  assert.equal(textDir('شكون أحنا'), 'rtl')
})
