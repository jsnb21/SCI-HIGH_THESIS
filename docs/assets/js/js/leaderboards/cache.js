// Lightweight cache with memory + sessionStorage fallback
// API:
// - get(key): returns value or undefined
// - set(key, value, ttlMs?): stores value with optional TTL
// - cached(key, ttlMs, loader): returns cached value or uses loader() to fetch and cache
// - invalidate(key): remove one key
// - clear(prefix?): clear all or those starting with prefix

(function(){
  const NS = 'lb:'; // namespace prefix to avoid collisions in sessionStorage
  const mem = new Map();

  function now(){ return Date.now(); }

  function pack(value, ttlMs){
    const expiresAt = ttlMs ? now() + ttlMs : 0;
    return { v: value, e: expiresAt };
  }

  function isExpired(entry){
    if (!entry) return true;
    if (!entry.e || entry.e === 0) return false; // no expiry
    return entry.e <= now();
  }

  function readSS(key){
    try {
      const raw = sessionStorage.getItem(NS + key);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (_) { return undefined; }
  }

  function writeSS(key, entry){
    try { sessionStorage.setItem(NS + key, JSON.stringify(entry)); } catch (_) {}
  }

  function removeSS(key){
    try { sessionStorage.removeItem(NS + key); } catch (_) {}
  }

  function get(key){
    let entry = mem.get(key);
    if (!entry) entry = readSS(key);
    if (!entry) return undefined;
    if (isExpired(entry)) {
      mem.delete(key);
      removeSS(key);
      return undefined;
    }
    return entry.v;
  }

  function set(key, value, ttlMs){
    const entry = pack(value, ttlMs);
    mem.set(key, entry);
    writeSS(key, entry);
    return value;
  }

  async function cached(key, ttlMs, loader){
    const cachedVal = get(key);
    if (cachedVal !== undefined) return cachedVal;
    const value = await loader();
    // Do not cache empty/falsy results to avoid sticky empty states on first load
    const shouldSkipCache = (
      value === undefined ||
      value === null ||
      (Array.isArray(value) && value.length === 0) ||
      (value && value.__noCache === true)
    );
    if (!shouldSkipCache) {
      set(key, value, ttlMs);
    }
    return value;
  }

  function invalidate(key){
    mem.delete(key);
    removeSS(key);
  }

  function clear(prefix){
    if (!prefix){
      mem.clear();
      try {
        for (let i=0;i<sessionStorage.length;i++){
          const k = sessionStorage.key(i);
          if (k && k.startsWith(NS)) sessionStorage.removeItem(k);
        }
      } catch(_){}
      return;
    }
    // with prefix
    mem.forEach((_, k)=>{ if (k.startsWith(prefix)) mem.delete(k); });
    try {
      const toRemove = [];
      for (let i=0;i<sessionStorage.length;i++){
        const k = sessionStorage.key(i);
        if (k && k.startsWith(NS + prefix)) toRemove.push(k);
      }
      toRemove.forEach(k=> sessionStorage.removeItem(k));
    } catch(_){}
  }

  // expose as ESM-friendly global module pattern and window helper
  const api = { get, set, cached, invalidate, clear };
  if (typeof window !== 'undefined') window.leaderboardCache = api;
  // Also support ESM import via dynamic import shim
  // Consumers can: const cache = await import('./cache.js').then(m=>m.default||window.leaderboardCache)
  try { 
    // define default export when treated as module
    // eslint-disable-next-line no-undef
    if (typeof exportDefault !== 'undefined') {}
  } catch(_) {}

  // Assign to globalThis for consistency
  if (typeof globalThis !== 'undefined') globalThis.leaderboardCache = api;

  // For ESM import default
  // We attach a property so bundlers that evaluate the file as module can pick default
  // Not all environments will read this, but safe to include.
  // eslint-disable-next-line no-undef
  if (typeof module !== 'undefined') {
    // no-op in browser; placeholder for tools that inspect module
  }

})();

export default (typeof window !== 'undefined' && window.leaderboardCache) ? window.leaderboardCache : undefined;
