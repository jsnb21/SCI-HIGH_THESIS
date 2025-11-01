// aiRerankService.js
// Reranks a locally-filtered candidate set using Google AI Studio (Gemini) with metadata only.
// Privacy: send only anonymized metadata; no question text or answers.

import masteryService from './masteryService.js';

let BACKOFF_UNTIL_MS = 0; // simple in-tab cooldown
const MODELS_CACHE_KEY = 'gemini_models_cache_v1';
const RERANK_CACHE_KEY = 'gemini_rerank_cache_v1';

// Basic rate limiting to avoid free-tier quota hits
const RATE_LIMIT = { minGapMs: 20000, perMinute: 3, windowMs: 60000 };
let LAST_CALL_MS = 0;
let WINDOW_START_MS = 0;
let CALLS_THIS_WINDOW = 0;

// Initialize persisted cooldown if previously set
try {
  const persisted = Number(sessionStorage.getItem('gemini_backoff_until') || 0);
  if (persisted) BACKOFF_UNTIL_MS = persisted;
} catch {}

const DEFAULT_CONFIG = {
  temperature: 0.25,
  requestTimeoutMs: 1200,
};

const DEFAULT_MODEL_ENDPOINT_PAIRS = [
  // Commonly available flash variants
  { endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', model: 'gemini-1.5-flash' },
  { endpoint: 'https://generativelanguage.googleapis.com/v1/models', model: 'gemini-1.5-flash' },
  { endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', model: 'gemini-1.5-flash-001' },
  { endpoint: 'https://generativelanguage.googleapis.com/v1/models', model: 'gemini-1.5-flash-001' },
  { endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', model: 'gemini-1.5-flash-latest' },
  { endpoint: 'https://generativelanguage.googleapis.com/v1/models', model: 'gemini-1.5-flash-latest' },
  // Smaller/easier to access variant in some projects
  { endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', model: 'gemini-1.5-flash-8b' },
  { endpoint: 'https://generativelanguage.googleapis.com/v1/models', model: 'gemini-1.5-flash-8b' },
  // As a last resort, try pro (may be gated for some keys)
  { endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', model: 'gemini-1.5-pro' },
  { endpoint: 'https://generativelanguage.googleapis.com/v1/models', model: 'gemini-1.5-pro' },
];

function loadCachedPairs() {
  try {
    const raw = sessionStorage.getItem(MODELS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.pairs)) return null;
    // 6-hour TTL
    if ((Date.now() - (parsed.ts || 0)) > 6 * 60 * 60 * 1000) return null;
    return parsed.pairs;
  } catch { return null; }
}

function saveCachedPairs(pairs) {
  try {
    sessionStorage.setItem(MODELS_CACHE_KEY, JSON.stringify({ ts: Date.now(), pairs }));
  } catch {}
}

async function discoverAvailablePairs(apiKey) {
  // Try listing models on v1 then v1beta; pick those supporting generateContent
  const versions = ['v1', 'v1beta'];
  const results = [];
  for (const v of versions) {
    const url = `https://generativelanguage.googleapis.com/${v}/models?key=${encodeURIComponent(apiKey)}`;
    try {
      const res = await fetchWithTimeout(url, { method: 'GET', timeout: 2500 });
      if (!res.ok) continue;
      const data = await res.json();
      const models = Array.isArray(data?.models) ? data.models : [];
      for (const m of models) {
        const name = m?.name; // e.g., 'models/gemini-1.5-flash'
        const methods = m?.supportedGenerationMethods || [];
        if (!name || !methods.includes('generateContent')) continue;
        const id = name.startsWith('models/') ? name.slice('models/'.length) : name;
        results.push({ endpoint: `https://generativelanguage.googleapis.com/${v}/models`, model: id });
      }
    } catch {
      // ignore and try next
    }
    // If we found any on v1, that's usually enough
    if (results.length) break;
  }
  if (!results.length) return [];
  // Dedup and sort by preference: flash-8b > flash > pro > everything else
  const seen = new Set();
  const dedup = results.filter(r => {
    const key = `${r.endpoint}|${r.model}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  const rank = (m) => {
    const id = m.model;
    if (/flash-8b/i.test(id)) return 1;
    if (/1\.5-flash(?!-8b)/i.test(id)) return 2;
    if (/1\.5-pro/i.test(id)) return 3;
    if (/1\.0-pro/i.test(id)) return 4;
    return 9;
  };
  dedup.sort((a,b) => rank(a) - rank(b));
  return dedup.slice(0, 6);
}

// Simple session-level cache to reduce duplicate requests within a short time window
function loadRerankCache() {
  try {
    const raw = sessionStorage.getItem(RERANK_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveRerankCache(map) {
  try { sessionStorage.setItem(RERANK_CACHE_KEY, JSON.stringify(map)); } catch {}
}

function buildSignature(candidates, session, bloomMix) {
  try {
    const ids = candidates.map(c => c.id).sort();
    const sig = {
      ids,
      maxItems: session?.maxItems,
      avoidRecentDays: session?.avoidRecentDays,
      difficultyBand: session?.difficultyBand,
      bloomMix,
    };
    return JSON.stringify(sig);
  } catch { return null; }
}

function getCachedRerank(signature, ttlMs = 30 * 60 * 1000) {
  if (!signature) return null;
  const map = loadRerankCache();
  const entry = map[signature];
  if (!entry) return null;
  if ((Date.now() - (entry.ts || 0)) > ttlMs) return null;
  return entry.data;
}

function putCachedRerank(signature, data, maxEntries = 20) {
  if (!signature || !data) return;
  const map = loadRerankCache();
  map[signature] = { ts: Date.now(), data };
  // trim if too large
  const keys = Object.keys(map);
  if (keys.length > maxEntries) {
    keys.sort((a,b) => (map[a].ts||0) - (map[b].ts||0));
    for (let i = 0; i < keys.length - maxEntries; i++) delete map[keys[i]];
  }
  saveRerankCache(map);
}

function passesRateLimit() {
  const now = Date.now();
  if (now < BACKOFF_UNTIL_MS) return false;
  if (now - LAST_CALL_MS < RATE_LIMIT.minGapMs) return false;
  if (!WINDOW_START_MS || (now - WINDOW_START_MS) > RATE_LIMIT.windowMs) {
    WINDOW_START_MS = now;
    CALLS_THIS_WINDOW = 0;
  }
  if (CALLS_THIS_WINDOW >= RATE_LIMIT.perMinute) return false;
  return true;
}

function markCall() {
  LAST_CALL_MS = Date.now();
  if (!WINDOW_START_MS || (LAST_CALL_MS - WINDOW_START_MS) > RATE_LIMIT.windowMs) {
    WINDOW_START_MS = LAST_CALL_MS;
    CALLS_THIS_WINDOW = 0;
  }
  CALLS_THIS_WINDOW++;
}

// Local utility function used for fallback and pre-score
function localUtilityScore(q, { mastery, history }, weights = { w1: 0.6, w2: 0.15, w3: 0.15, w4: 0.1, w5: 0.1 }) {
  const { w1, w2, w3, w4, w5 } = weights;
  const topicMastery = (mastery[q.topic]?.[q.bloom] ?? 0.6);
  const weakness = 1 - topicMastery;
  const seenDays = masteryService.getSeenDaysAgo(q.id);
  const novelty = Math.min(1, (seenDays == null ? 1 : Math.max(0, seenDays / 14))); // unseen or long ago → higher
  const spaced = Math.min(1, (seenDays == null ? 0.4 : Math.max(0, (seenDays - 3) / 14)));
  const engagementFit = q.estSec ? (q.estSec >= 30 && q.estSec <= 75 ? 1 : 0.6) : 0.8;
  const fatigueRisk = q.difficulty >= 5 ? 0.6 : q.difficulty <= 1 ? 0.3 : 0.45; // rough heuristic
  return w1 * weakness + w2 * novelty + w3 * spaced + w4 * engagementFit - w5 * fatigueRisk;
}

// Validate output matches the expected minimal schema
function validateRankedJson(json) {
  if (!json || typeof json !== 'object' || !Array.isArray(json.ranked)) return null;
  // Filter to safe fields
  const ranked = json.ranked.map(item => ({
    id: String(item.id),
    bloom: item.bloom ? String(item.bloom) : undefined,
    difficulty: typeof item.difficulty === 'number' ? item.difficulty : undefined,
    reason: item.reason ? String(item.reason) : '',
  })).filter(x => x.id);
  return { ranked };
}

// We embed policy in the user instruction to keep API usage simple and avoid role issues.

function buildUserPayload({ player, session, candidates }) {
  // Compose a single prompt with JSON payload and explicit instruction for JSON-only output
  const jsonPayload = {
    player: { mastery: player.mastery, history: player.history },
    session: { maxItems: session.maxItems, avoidRecentDays: session.avoidRecentDays, difficultyBand: session.difficultyBand },
    candidates: candidates.map(c => ({ id: c.id, bloom: c.bloom, difficulty: c.difficulty, seenDaysAgo: c.seenDaysAgo ?? null, preScore: c.preScore ?? null })),
  };
  const instruction = 'Return up to session.maxItems ranked by expected learning value. Prefer weaker Bloom levels from player.mastery, avoid recently seen items, respect difficultyBand, include a small exploration portion. Output strictly JSON with key "ranked" and items of shape {"id": string} only—no extra text.';
  return [
    { role: 'user', parts: [{ text: instruction + '\n\nInput JSON:\n' + JSON.stringify(jsonPayload) }]},
  ];
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = DEFAULT_CONFIG.requestTimeoutMs } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

function getApiKey() {
  try {
    // Read from global injected config if present; never hardcode secrets.
    const key = window?.SCI_HIGH?.GOOGLE_AI_API_KEY || window?.env?.GOOGLE_AI_API_KEY || null;
    return key;
  } catch { return null; }
}

function getModelEndpointPairsOverride() {
  try {
    const o = window?.SCI_HIGH?.GEMINI;
    if (!o) return null;
    if (o.urlOverride) {
      // Allow full URL override (advanced)
      return [{ url: o.urlOverride }];
    }
    if (o.endpoint && o.model) {
      return [{ endpoint: o.endpoint, model: o.model }];
    }
    return null;
  } catch { return null; }
}

function localRerank(candidates, context) {
  const scored = candidates.map(c => ({
    ...c,
    _score: localUtilityScore(c, context),
  }));
  scored.sort((a,b) => b._score - a._score);
  return scored.map(s => ({ id: s.id, bloom: s.bloom, difficulty: s.difficulty, reason: 'local-utility' }));
}

// Simple in-flight de-duplication to avoid duplicate concurrent calls for the same signature
const PENDING = new Map(); // signature -> Promise<{ranked:[]}>

// Per-day budget to extend free tier usage across sessions in a tab
function getDailyKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function canSpendDaily(apiCallsPerDay) {
  try {
    const day = getDailyKey();
    const raw = localStorage.getItem('gemini_daily_usage');
    const data = raw ? JSON.parse(raw) : {};
    const rec = data[day] || { count: 0 };
    return rec.count < apiCallsPerDay;
  } catch { return true; }
}
function spendDaily(apiCallsPerDay) {
  try {
    const day = getDailyKey();
    const raw = localStorage.getItem('gemini_daily_usage');
    const data = raw ? JSON.parse(raw) : {};
    const rec = data[day] || { count: 0 };
    rec.count = Math.min(apiCallsPerDay, (rec.count || 0) + 1);
    data[day] = rec;
    localStorage.setItem('gemini_daily_usage', JSON.stringify(data));
  } catch {}
}

function getDailyBudgetLimit() {
  try { return Number(window?.SCI_HIGH?.AI_MAX_CALLS_PER_DAY) || 5; } catch { return 5; }
}

const aiRerankService = {
  // Build candidate pool from full questions array by attaching minimal metadata
  buildCandidates(questions, { topic = 'General' } = {}) {
    return questions.map((q, idx) => {
      const id = q.id || `Q_${idx}`;
      const bloom = q.bloom || q.bloomLevel || q.bloomTarget || 'Understand';
      const difficulty = typeof q.difficulty === 'number' ? q.difficulty : 2;
      const estSec = typeof q.estSec === 'number' ? q.estSec : 45;
      const seenDaysAgo = masteryService.getSeenDaysAgo(id);
      return { id, topic: q.topic || topic, bloom, difficulty, estSec, seenDaysAgo };
    });
  },

  prefilter(candidates, { avoidRecentDays = 3, difficultyBand = [1,5], maxPool = 30, includeNovelPct = 0.15 }) {
    const [minD, maxD] = difficultyBand;
    const recentCut = candidates.filter(c => (c.seenDaysAgo ?? 999) >= avoidRecentDays && c.difficulty >= minD && c.difficulty <= maxD);
    const unseen = candidates.filter(c => c.seenDaysAgo == null);
    // Mix in novel items
    const novelCount = Math.max(0, Math.floor((recentCut.length || 10) * includeNovelPct));
    const mixed = recentCut.concat(unseen.slice(0, novelCount));
    // Cap pool
    return mixed.slice(0, maxPool);
  },

  async rerank({ candidates, session, bloomMix }) {
    const player = masteryService.getPlayerVector();
    const context = { mastery: player.mastery, history: player.history };

    // If no API key or environment is offline, fallback to local
    const apiKey = getApiKey();
    if (!apiKey || typeof fetch !== 'function') {
      return { ranked: localRerank(candidates, context).slice(0, session.maxItems) };
    }

    // Pre-score and include as feature
    const enriched = candidates.map(c => ({ ...c, preScore: localUtilityScore(c, context) }));

    // Cache check before any calls
    const signature = buildSignature(candidates, session, bloomMix);
    const cached = getCachedRerank(signature);
    if (cached && Array.isArray(cached.ranked) && cached.ranked.length) {
      return { ranked: cached.ranked.slice(0, session.maxItems) };
    }

    // Respect cooldown, rate limits, and per-day budget
    const dailyLimit = getDailyBudgetLimit();
    if (Date.now() < BACKOFF_UNTIL_MS || !passesRateLimit() || !canSpendDaily(dailyLimit)) {
      return { ranked: localRerank(candidates, context).slice(0, session.maxItems) };
    }

    // In-flight de-duplication: if same signature request is ongoing, await it
    if (signature && PENDING.has(signature)) {
      try { return await PENDING.get(signature); } catch { /* ignore */ }
    }

    const overridePairs = getModelEndpointPairsOverride();
    let pairs = overridePairs || loadCachedPairs();
    if (!pairs) {
      // Try to discover models compatible with this key
      const discovered = await discoverAvailablePairs(apiKey);
      if (discovered && discovered.length) {
        pairs = discovered;
        saveCachedPairs(pairs);
      }
    } else if (overridePairs) {
      // Even with an override, append discovered models as backups to avoid hard failures
      const discovered = await discoverAvailablePairs(apiKey);
      if (discovered && discovered.length) {
        const seen = new Set(overridePairs.map(p=>`${p.endpoint}|${p.model||p.url||''}`));
        const extras = discovered.filter(p=>{
          const k = `${p.endpoint}|${p.model||p.url||''}`;
          if (seen.has(k)) return false; seen.add(k); return true;
        });
        pairs = [...overridePairs, ...extras];
      }
    }
    // Fallback to defaults if discovery failed; limit attempts
    pairs = (pairs || DEFAULT_MODEL_ENDPOINT_PAIRS).slice(0, 4);

    const body = {
      contents: [
        ...buildUserPayload({ player: { targets: { bloomMix }, mastery: player.mastery, history: player.history }, session, candidates: enriched }),
      ],
      generationConfig: { temperature: DEFAULT_CONFIG.temperature, maxOutputTokens: 128 },
    };

    // Try pairs in order until one returns OK and valid JSON; else fall back locally
    let attempts = 0;
    let result = null;
    const promise = (async () => {
      for (const p of pairs) {
      const base = p.url || `${p.endpoint}/${encodeURIComponent(p.model)}:generateContent`;
      const url = `${base}?key=${encodeURIComponent(apiKey)}`;
      try {
        // mark rate-limit usage per attempt
        markCall();
          // consume one from daily budget for the first network attempt only
          spendDaily(dailyLimit);
        const res = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          timeout: DEFAULT_CONFIG.requestTimeoutMs,
        });
        attempts++;
        if (!res.ok) {
          if (attempts === 1) {
            // surface minimal diagnostic for first failure only
            const text = await res.text().catch(() => '');
            console.warn('Gemini rerank non-OK:', res.status, res.statusText, text?.slice(0, 200));
          }
          // Quota exceeded: enable a longer backoff and stop trying more models
          if (res.status === 429) {
            BACKOFF_UNTIL_MS = Date.now() + 60 * 60 * 1000; // 60 minutes
            try { sessionStorage.setItem('gemini_backoff_until', String(BACKOFF_UNTIL_MS)); } catch {}
            break; // don't try other pairs
          }
          // If we keep hitting 400/404 across pairs, enable a brief backoff to reduce log noise
          if ((res.status === 404 || res.status === 400) && attempts >= Math.min(3, pairs.length)) {
            BACKOFF_UNTIL_MS = Date.now() + 10 * 60 * 1000; // 10 minutes
            try { sessionStorage.setItem('gemini_backoff_until', String(BACKOFF_UNTIL_MS)); } catch {}
          }
          continue; // try next pair
        }
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('\n') || '';
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        const jsonStr = firstBrace >= 0 && lastBrace > firstBrace ? text.slice(firstBrace, lastBrace + 1) : '';
        const parsed = jsonStr ? JSON.parse(jsonStr) : null;
        const validated = validateRankedJson(parsed);
        if (validated && validated.ranked.length) {
          const allowed = new Set(candidates.map(c => c.id));
          const filtered = validated.ranked.filter(r => allowed.has(r.id)).slice(0, session.maxItems);
          if (filtered.length) {
            // cache successful result
            putCachedRerank(signature, { ranked: filtered });
              result = { ranked: filtered };
              break;
          }
        }
      } catch (_) {
        // try next pair
      }
      }
      return result || { ranked: localRerank(candidates, context).slice(0, session.maxItems) };
    })();
    if (signature) PENDING.set(signature, promise);
    try { const out = await promise; return out; } finally { if (signature) PENDING.delete(signature); }
  },
};

export default aiRerankService;
