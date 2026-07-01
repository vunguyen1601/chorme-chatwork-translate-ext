export const DEFAULTS = Object.freeze({
  targetIncoming: 'vi',
  targetOutgoing: 'ja',
  autoTranslateIncoming: false,
})

const KEY = 'cwTranslateSettings'

export async function getSettings() {
  const { [KEY]: stored } = await chrome.storage.local.get(KEY)
  return { ...DEFAULTS, ...(stored || {}) }
}

export async function saveSettings(patch) {
  const allowed = Object.keys(DEFAULTS)
  const clean = {}
  for (const k of allowed) if (k in patch) clean[k] = patch[k]
  const next = { ...(await getSettings()), ...clean }
  await chrome.storage.local.set({ [KEY]: next })
  return next
}
