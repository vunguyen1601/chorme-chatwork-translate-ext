// src/adapters/adapter.js
const NI = (name) => () => { throw new Error(`adapter method not implemented: ${name}`) }

export function createAdapterBase() {
  return {
    matches: NI('matches'),
    getMessageContainer: NI('getMessageContainer'),
    extractMessages: NI('extractMessages'),
    getMessageId: NI('getMessageId'),
    isTranslationArtifact: NI('isTranslationArtifact'),
    mountIncomingTranslation: NI('mountIncomingTranslation'),
    getComposeElement: NI('getComposeElement'),
    getComposeText: NI('getComposeText'),
    setComposeText: NI('setComposeText'),
    getComposeToolbar: NI('getComposeToolbar'),
  }
}
