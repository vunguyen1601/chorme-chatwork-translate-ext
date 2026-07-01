export class TtlCache {
  constructor({ ttlMs = 3600_000, now = () => Date.now() } = {}) {
    this.ttlMs = ttlMs
    this.now = now
    this.map = new Map()
  }
  get(key) {
    const e = this.map.get(key)
    if (!e) return undefined
    if (this.now() >= e.exp) { this.map.delete(key); return undefined }
    return e.val
  }
  set(key, val) {
    this.map.set(key, { val, exp: this.now() + this.ttlMs })
  }
}

export class RateLimitedQueue {
  constructor({ minGapMs = 200, now = () => Date.now() } = {}) {
    this.minGapMs = minGapMs
    this.now = now
    this.chain = Promise.resolve()
    this.lastStart = -Infinity
  }
  push(job) {
    const run = async () => {
      const wait = Math.max(0, this.lastStart + this.minGapMs - this.now())
      if (wait > 0) await new Promise((r) => setTimeout(r, wait))
      this.lastStart = this.now()
      return job()
    }
    // Chain so jobs run one at a time; isolate caller errors from the chain.
    const result = this.chain.then(run)
    this.chain = result.catch(() => {})
    return result
  }
}
