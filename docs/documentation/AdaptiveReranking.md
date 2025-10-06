# Adaptive Randomization via Bloom Weakness (Client-only Content)

This module re-ranks a small candidate set of local questions using Google AI Studio (Gemini), sending only metadata (IDs + tags), never the full question text.

## Files
- `src/services/masteryService.js` — tracks per-player mastery vectors and history (localStorage; optional Firebase aggregate sync)
- `src/services/aiRerankService.js` — builds metadata payload, calls Gemini with a strict JSON-only instruction, validates output, and falls back to a deterministic local scorer
- `src/services/customQuizService.js` — normalization now auto-attaches metadata fields: `id`, `topic`, `bloom`, `difficulty`, `estSec`
- `src/scenes/quizscenes/CustomQuizScene.js` — integrates pre-filter + re-rank to order questions before the quiz starts, and logs outcomes to mastery

## Privacy
- Only IDs and lightweight tags are sent: `{id, topic, bloom, difficulty, seenDaysAgo, estSec, preScore}`
- No question text, options, or answers leave the client
- No PII: API payload uses anonymous vectors; optional Firebase sync writes to `mastery_aggregates/{uid}` only if available

## Selection Flow
1. Build candidates from the local question list with minimal metadata
2. Prefilter locally: difficulty band, avoid items seen too recently, include a few novel ones
3. Call AI Studio with: player mastery vector, session constraints (time, bloom mix), and candidate list
4. Receive JSON with ranked IDs + reasons; reorder locally and serve
5. Log outcomes (correct/time) to update mastery; mark lastSeen and seenCount
6. On timeout or error, fallback to the local utility scorer

## Local Scoring (fallback and pre-score)
Utility(q) = w1*(1 − mastery[bloom][topic]) + w2*novelty + w3*spaced + w4*engagementFit − w5*fatigueRisk
- Deterministic, temperature is only used in the AI call (0.25)

## Environment Configuration
Expose an API key at runtime via a global var. Do NOT commit secrets.

Example in your HTML boot page:

<script>
  window.SCI_HIGH = {
    GOOGLE_AI_API_KEY: '<your key here>'
  };
</script>

Or inject via server-side template. If `GOOGLE_AI_API_KEY` is absent, the system quietly uses local scoring only.

### Recommended setup (no secrets in git)

- Create `docs/config/ai-key.js` locally (do not commit) from the provided example:
  - Copy `docs/config/ai-key.example.js` to `docs/config/ai-key.js`
  - Put your actual key in that file.
- Reference it in your HTML before any scripts that may use the key:

In `docs/index.html` (home/landing) — place near top of `<head>` so the chatbot and any UI can read it:

<!-- Optional: runtime AI key (local only; do not commit real keys) -->
<script src="config/ai-key.js" defer></script>

In `docs/game.html` — place in `<head>` before the module preloader block, so game scenes/services can see it:

<!-- Optional: runtime AI key (local only; do not commit real keys) -->
<script src="config/ai-key.js"></script>

If the file is missing, nothing breaks; adaptive ranking just falls back to the local scorer.

## Smoke test checklist

- Without `ai-key.js`, verify quizzes still run and order seems reasonable (local utility scorer)
- With a valid key, start a quiz twice: ordering should adjust towards lower-mastery Bloom levels
- Open DevTools Network tab: confirm no question text/answers are sent, only metadata in the AI POST
- Temporarily throttle network/offline: calls time out and fall back without errors in UI

## Output Schema (from AI)
- Input instruction enforces JSON-only output with:
  { "ranked": [ { "id": "string", "bloom": "string", "difficulty": number, "reason": "string" } ] }

## Guardrails
- Timeout ~1200ms, then fallback
- Strict JSON extraction with validation
- Forbidden to generate content in system instruction; only ranks IDs
- Handles small pools and all-recent cases using unseen mix-in

## Extend
- Add embeddings to group similar subskills (still local)
- Extend telemetry with per-bloom time-to-correct; adjust mastery deltas
- Cache ranked results per session to reduce API calls

---

This keeps question content local while targeting Bloom weaknesses adaptively with minimal integration effort.
