import { getSettings, saveSettings } from '../shared/settings.js'

const auto = document.getElementById('auto')
const inp = document.getElementById('in')
const out = document.getElementById('out')

const s = await getSettings()
auto.checked = s.autoTranslateIncoming
inp.value = s.targetIncoming
out.value = s.targetOutgoing

auto.addEventListener('change', () => saveSettings({ autoTranslateIncoming: auto.checked }))
inp.addEventListener('change', () => saveSettings({ targetIncoming: inp.value.trim() }))
out.addEventListener('change', () => saveSettings({ targetOutgoing: out.value.trim() }))
