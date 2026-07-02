import { getSettings, saveSettings } from '../shared/settings.js'

const auto = document.getElementById('auto')
const inp = document.getElementById('in')
const out = document.getElementById('out')

const s = await getSettings()
auto.checked = s.autoTranslateIncoming
inp.value = s.targetIncoming
out.value = s.targetOutgoing

// Write a complete snapshot of all three controls at once, so two rapid edits to
// different fields can't clobber each other via saveSettings' read-modify-write.
// Blank language fields are ignored (keep the prior value) to avoid persisting an
// empty translation target.
function persist() {
  const patch = { autoTranslateIncoming: auto.checked }
  const incoming = inp.value.trim()
  const outgoing = out.value.trim()
  if (incoming) patch.targetIncoming = incoming
  if (outgoing) patch.targetOutgoing = outgoing
  saveSettings(patch)
}

auto.addEventListener('change', persist)
inp.addEventListener('change', persist)
out.addEventListener('change', persist)
