// customQuizService.js
// Service to load professor-created custom quizzes from Firebase Realtime Database or localStorage fallback
// Assumptions:
// 1. Firebase has been initialized elsewhere (similar to authService) and is accessible via window.firebase
// 2. Custom quizzes are stored under path: customQuizzes/{professorId}/{quizId}
//    Each quiz document structure:
//    {
//       meta: { title: string, subject: string, createdAt: ISOString, createdBy: professorId },
//       questions: [ { question, options, correctIndex, type? } ]
//    }
// 3. If offline or firebase unavailable, we attempt to read from localStorage key: 'sci_high_custom_quizzes'

const LOCAL_STORAGE_KEY = 'sci_high_custom_quizzes';

function log(...args) {
  console.log('[CustomQuizService]', ...args);
}

class CustomQuizService {
  constructor() {
    this._db = null;
    this._initialized = false;
  }

  ensureFirebase() {
    try {
      if (this._initialized) return this._db;
      if (typeof window !== 'undefined' && window.firebase && window.firebase.database) {
        this._db = window.firebase.database();
        this._initialized = true;
      }
      return this._db;
    } catch (e) {
      console.warn('CustomQuizService firebase init failed', e);
      return null;
    }
  }

  /**
   * Save a custom quiz locally (used by professor UI or fallback caching)
   */
  saveLocalQuiz(professorId, quizId, quizData) {
    try {
      const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
      if (!existing[professorId]) existing[professorId] = {};
      existing[professorId][quizId] = quizData;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
      console.error('Failed to cache custom quiz locally', e);
    }
  }

  /**
   * Load a single custom quiz. If quizId omitted and professor has only one quiz, returns that quiz.
   * @param {Object} params
   * @param {string} params.professorId
   * @param {string} [params.quizId]
   * @returns {Promise<{questions: Array, meta: Object} | null>}
   */
  async loadCustomQuiz({ professorId, quizId }) {
    // Try firebase first
    const db = this.ensureFirebase();
    if (db) {
      try {
        if (quizId) {
          const snapshot = await db.ref(`customQuizzes/${professorId}/${quizId}`).once('value');
          if (snapshot.exists()) {
            const data = snapshot.val();
            this.saveLocalQuiz(professorId, quizId, data); // cache
            return data;
          }
        } else {
          const snapshot = await db.ref(`customQuizzes/${professorId}`).once('value');
          if (snapshot.exists()) {
            const all = snapshot.val();
            const firstKey = Object.keys(all)[0];
            const data = all[firstKey];
            this.saveLocalQuiz(professorId, firstKey, data);
            return data;
          }
        }
      } catch (e) {
        console.warn('CustomQuizService firebase read failed, falling back', e);
      }
    }

    // Fallback localStorage
    try {
      const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
      if (!existing[professorId]) return null;
      if (quizId) return existing[professorId][quizId] || null;
      const keys = Object.keys(existing[professorId]);
      if (keys.length === 0) return null;
      return existing[professorId][keys[0]];
    } catch (e) {
      console.error('CustomQuizService local fallback failed', e);
      return null;
    }
  }

  /**
   * Normalize quiz questions into BaseQuizScene expected format
   */
  normalizeQuestions(rawQuestions) {
    // Case 1: Already an array (legacy flat format)
    if (Array.isArray(rawQuestions)) {
      return rawQuestions.map(q => ({
        question: q.question || q.text || 'Untitled Question',
        options: q.options || q.choices || [],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : (q.answerIndex || 0),
        type: q.type || 'multiple-choice'
      }));
    }
    // Case 2: Passed full quiz object with intensity* structure
    if (rawQuestions && typeof rawQuestions === 'object') {
      const collected = [];
      const processIntensity = (node) => {
        if (!node) return;
        // multipleChoice arrays
        if (Array.isArray(node.multipleChoice)) {
          node.multipleChoice.forEach(q => {
            if (q && (q.options || q.choices)) {
              collected.push({
                question: q.question || 'Untitled Question',
                options: q.options || q.choices || [],
                correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
                type: 'multiple-choice'
              });
            }
          });
        }
        // Any direct questions array fallback
        if (Array.isArray(node.questions)) {
          node.questions.forEach(q => {
            if (q && (q.options || q.choices)) {
              collected.push({
                question: q.question || 'Untitled Question',
                options: q.options || q.choices || [],
                correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
                type: 'multiple-choice'
              });
            }
          });
        }
      };
      ['intensity1','intensity2','intensity3'].forEach(key => processIntensity(rawQuestions[key]));

      // If still empty and looks like a flat legacy object with questions property
      if (collected.length === 0 && Array.isArray(rawQuestions.questions)) {
        return this.normalizeQuestions(rawQuestions.questions);
      }
      return collected;
    }
    return [];
  }
}

const customQuizService = new CustomQuizService();
export default customQuizService;
