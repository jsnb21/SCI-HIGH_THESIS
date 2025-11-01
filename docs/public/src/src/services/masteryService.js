// masteryService.js
// Tracks per-player Bloom mastery vectors, lastSeen timestamps, seen counts, and outcomes.
// Privacy: stored locally (localStorage). If Firebase Realtime Database is available and a
// userId exists, it can optionally sync aggregates under a non-PII key.

const STORAGE_KEYS = {
  mastery: 'sci_high_mastery_v1',
  history: 'sci_high_history_v1',
};

const BLOOM_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

function nowIso() { return new Date().toISOString(); }
function daysAgoFromIso(iso) {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

class MasteryService {
  constructor() {
    this._cache = { mastery: null, history: null };
    this._firebase = null;
    this._userId = null;
    this._tryInitFirebase();
  }

  _tryInitFirebase() {
    try {
      if (typeof window !== 'undefined' && window.firebase && window.firebase.database) {
        this._firebase = window.firebase.database();
        // Try to get a stable anonymous id if available
        const user = window.firebase.auth ? window.firebase.auth().currentUser : null;
        this._userId = user ? (user.uid || null) : null;
      }
    } catch (e) {
      // keep local-only
    }
  }

  _load(key, fallback) {
    if (this._cache[key]) return this._cache[key];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS[key]);
      if (!raw) return (this._cache[key] = fallback);
      const parsed = JSON.parse(raw);
      this._cache[key] = parsed || fallback;
      return this._cache[key];
    } catch (e) {
      return (this._cache[key] = fallback);
    }
  }

  _save(key, value) {
    this._cache[key] = value;
    try { localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value)); } catch {}
  }

  getMastery() {
    // Structure: { [topic]: { [BloomLevel]: number in [0,1] } }
    return this._load('mastery', {});
  }

  getHistory() {
    // Structure: { lastSeen: { [qId]: iso }, seenCount: { [qId]: number }, outcomes: [{ qId, topic, bloom, correct, timeSec, atIso }] }
    return this._load('history', { lastSeen: {}, seenCount: {}, outcomes: [] });
  }

  ensureTopic(topic) {
    const mastery = this.getMastery();
    if (!mastery[topic]) {
      mastery[topic] = {};
      BLOOM_LEVELS.forEach(l => { mastery[topic][l] = 0.6; }); // neutral default
      this._save('mastery', mastery);
    }
    return mastery[topic];
  }

  updateMastery(topic, bloomLevel, delta) {
    const mastery = this.getMastery();
    this.ensureTopic(topic);
    const clamped = (mastery[topic][bloomLevel] ?? 0.6) + delta;
    mastery[topic][bloomLevel] = Math.max(0, Math.min(1, clamped));
    this._save('mastery', mastery);
    this._maybeSync();
  }

  markSeen(qId) {
    const history = this.getHistory();
    history.lastSeen[qId] = nowIso();
    history.seenCount[qId] = (history.seenCount[qId] || 0) + 1;
    this._save('history', history);
  }

  recordOutcome(qId, { topic = 'General', bloom = 'Understand', correct = false, timeSec = null, difficulty = 2 }) {
    const history = this.getHistory();
    history.outcomes.push({ qId, topic, bloom, correct, timeSec, difficulty, atIso: nowIso() });
    // Keep last 500 for size
    if (history.outcomes.length > 500) history.outcomes.shift();
    this._save('history', history);

    // Mastery update heuristic
    const base = correct ? 0.04 : -0.06; // incorrect penalizes a bit more
    const speedAdj = timeSec == null ? 0 : (timeSec < 20 ? 0.01 : timeSec > 90 ? -0.01 : 0);
    const diffAdj = (difficulty - 3) * 0.01; // harder gives slightly more credit
    const delta = base + speedAdj + diffAdj;
    this.updateMastery(topic, bloom, delta);
  }

  getPlayerVector() {
    const mastery = this.getMastery();
    const history = this.getHistory();
    const correctRates = {};
    // Aggregate simple correct rates per topic.Bloom
    const agg = {};
    history.outcomes.forEach(o => {
      const key = `${o.topic}.${o.bloom}`;
      agg[key] = agg[key] || { c: 0, t: 0 };
      agg[key].t += 1; agg[key].c += o.correct ? 1 : 0;
    });
    Object.entries(agg).forEach(([k, v]) => { correctRates[k] = v.t ? v.c / v.t : 0; });

    return {
      mastery,
      history: {
        lastSeen: Object.keys(history.lastSeen),
        correctRates,
      },
    };
  }

  getSeenDaysAgo(qId) {
    const { lastSeen } = this.getHistory();
    return daysAgoFromIso(lastSeen[qId]);
  }

  _maybeSync() {
    // Optional, best-effort aggregate sync (non-PII). Safe to skip.
    try {
      const allowSync = !!(typeof window !== 'undefined' && window.SCI_HIGH && window.SCI_HIGH.ALLOW_FIREBASE_AGGREGATE_SYNC);
      if (!allowSync) return;
      if (!this._firebase || !this._userId) return;
      const mastery = this.getMastery();
      this._firebase.ref(`mastery_aggregates/${this._userId}`).update({ mastery, updatedAt: nowIso() });
    } catch {}
  }
}

const masteryService = new MasteryService();
export default masteryService;
export { BLOOM_LEVELS };
