// Minimal chrome API mock shared by unit tests. Individual tests override as needed.
globalThis.chrome = {
  storage: {
    local: {
      _data: {},
      async get(keys) {
        if (keys == null) return { ...this._data }
        if (typeof keys === 'string') return { [keys]: this._data[keys] }
        const out = {}
        for (const k of Object.keys(keys)) out[k] = this._data[k] ?? keys[k]
        return out
      },
      async set(obj) { Object.assign(this._data, obj) },
      async clear() { this._data = {} },
    },
  },
  runtime: { sendMessage: async () => ({}), onMessage: { addListener() {} } },
}
