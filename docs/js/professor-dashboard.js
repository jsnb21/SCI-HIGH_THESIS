/* Professor Dashboard logic extracted from professor-dashboard.html and enhanced with analytics */

class ProfessorDashboard {
  constructor() {
    this.students = [];
    this.filteredStudents = [];
    this.currentUser = null;
    this.database = null;
    this.isFirebaseInitialized = false;
    // Custom Quiz Builder State
    this.quizDraft = { meta: {}, questions: [] };
    this.loadedBank = [];
    this.filteredBank = [];
    this.activeBankKey = null; // 'python'|'java'|'webdesign'
    // Existing quizzes cache
    this.existingQuizzes = {};
    this.loadingExisting = false;
    // Charts
    this._charts = { strand: null, progress: null };
    // Pagination
    this.pageSize = 10;
    this.visibleCount = 10;
    this.init();
  }

  async init() {
    // Initialize Firebase first
    await this.initializeFirebase();
    // Ensure Firebase auth user (silent) before continuing (optional for rules that require auth)
    await this.ensureFirebaseAuth();
    
    // Check if user is authenticated professor or admin
    const savedUser = localStorage.getItem('sci_high_user');
    if (!savedUser) {
      window.location.href = 'index.html';
      return;
    }

    this.currentUser = JSON.parse(savedUser);
    if (!this.currentUser || (this.currentUser.type !== 'professor' && this.currentUser.type !== 'admin')) {
      window.location.href = 'index.html';
      return;
    }

    this.setupUI();
    this.setupEventListeners();
    await this.loadStudents();
    // Prepare quiz builder events
    this.setupQuizBuilder();
    // Initial analytics
    this.renderAnalytics();
  }

  setupUI() {
    const nameEl = document.getElementById('professor-name');
    if (nameEl && this.currentUser?.profile?.fullName) {
      nameEl.textContent = this.currentUser.profile.fullName;
    }
  }

  logoutUser() {
    try {
      localStorage.removeItem('sci_high_user');
      sessionStorage.removeItem('sci_high_authenticated');
      sessionStorage.removeItem('sci_high_user_type');
    } finally {
      window.location.href = 'index.html';
    }
  }

  setupEventListeners() {
    // Logout buttons
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn?.addEventListener('click', () => this.logoutUser());

    // Quick action buttons  
    const analyticsBtn = document.getElementById('view-analytics-btn');
    analyticsBtn?.addEventListener('click', () => {
      const section = document.getElementById('analytics-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        this.showInfo('Analytics section not available.');
      }
    });

    const exportBtn = document.getElementById('export-data-btn');
    exportBtn?.addEventListener('click', () => this.exportFilteredToCSV());

    const refreshStudentsBtn = document.getElementById('refresh-students-btn');
    refreshStudentsBtn?.addEventListener('click', async () => {
      await this.loadStudents();
      this.showSuccess('Student list refreshed!');
    });

    const refreshAnalyticsBtn = document.getElementById('refresh-analytics-btn');
    refreshAnalyticsBtn?.addEventListener('click', () => this.renderAnalytics());

    // Create quiz buttons (desktop + mobile)
    const createQuizBtn = document.getElementById('create-quiz-btn');
    const createQuizBtnMobile = document.getElementById('create-quiz-btn-mobile');
    if (createQuizBtn) createQuizBtn.addEventListener('click', () => this.openQuizModal());
    if (createQuizBtnMobile) createQuizBtnMobile.addEventListener('click', () => this.openQuizModal());

    // Search and filter
    document.getElementById('search-students')?.addEventListener('input', () => this.filterStudents());
    document.getElementById('filter-strand')?.addEventListener('change', () => this.filterStudents());
    document.getElementById('filter-year')?.addEventListener('change', () => this.filterStudents());
    document.getElementById('sort-by')?.addEventListener('change', () => this.filterStudents());

    // Pagination controls
    this.paginationInfoEl = document.getElementById('students-pagination-info');
    this.paginationBarEl = document.getElementById('students-pagination');
    this.loadMoreBtn = document.getElementById('students-load-more-btn');
    this.loadMoreBtn?.addEventListener('click', () => {
      const total = this.filteredStudents.length;
      this.visibleCount = Math.min(this.visibleCount + this.pageSize, total);
      this.renderStudentsTable();
      this.renderAnalytics();
    });

    // Mobile logout hookup (in case DOMContentLoaded runs before init)
    const mobileLogout = document.getElementById('mobile-logout-btn');
    mobileLogout?.addEventListener('click', () => this.logoutUser());
  }

  /* =============================
    QUIZ BUILDER METHODS
  ============================== */
  setupQuizBuilder() {
    this.quizModal = document.getElementById('quiz-modal-overlay');
    if (!this.quizModal) return;
    // Buttons & Inputs
    this.quizIdInput = document.getElementById('quiz-id-input');
    this.quizTitleInput = document.getElementById('quiz-title-input');
    this.quizSubjectInput = document.getElementById('quiz-subject-input');
    this.bankQuestionsContainer = document.getElementById('bank-questions-container');
    this.draftQuestionsContainer = document.getElementById('draft-questions-container');
    this.draftCountEl = document.getElementById('draft-count');
    this.draftStatusEl = document.getElementById('draft-status');
    this.loadedBankCountEl = document.getElementById('loaded-bank-count');
    this.questionSearchInput = document.getElementById('question-search-input');
  this.customQuestionForm = document.getElementById('custom-question-form');
  this.customQuestionType = document.getElementById('custom-question-type');
  this.customBloomTarget = document.getElementById('custom-bloom-target');
  // Multiple choice refs
  this.customQuestionText = document.getElementById('custom-question-text');
  this.customCorrectIndex = document.getElementById('custom-correct-index');
  this.customOptionInputs = Array.from(document.querySelectorAll('.custom-opt-input'));
  // Syntax form refs
  this.syntaxQuestion = document.getElementById('syntax-question');
  this.syntaxInstruction = document.getElementById('syntax-instruction');
  this.syntaxBlocksWrap = document.getElementById('syntax-blocks-wrap');
  // Arrangement refs
  this.arrangeTitle = document.getElementById('arrange-title');
  this.arrangeDescription = document.getElementById('arrange-description');
  this.arrangeBlocks = document.getElementById('arrange-blocks');
    // Existing quiz elements
    this.existingQuizzesContainer = document.getElementById('existing-quizzes-container');
    this.existingQuizzesStatus = document.getElementById('existing-quizzes-status');
    const refreshExistingBtn = document.getElementById('refresh-existing-quizzes');
    const newQuizBtn = document.getElementById('new-quiz-btn');

    // Event listeners
    document.getElementById('quiz-modal-close')?.addEventListener('click', () => this.closeQuizModal());
    document.getElementById('save-quiz-btn')?.addEventListener('click', () => this.saveQuizDraft());
    document.getElementById('clear-draft-btn')?.addEventListener('click', () => this.clearDraft());
    document.getElementById('add-custom-question-btn')?.addEventListener('click', () => this.toggleCustomQuestionForm(true));
    document.getElementById('cancel-custom-question')?.addEventListener('click', () => this.toggleCustomQuestionForm(false));
    document.getElementById('save-custom-question')?.addEventListener('click', () => this.addCustomQuestion());
    // toggle forms by type
    this.customQuestionType?.addEventListener('change', () => this.updateCustomFormVisibility());
    // add syntax block dynamically
    document.getElementById('syntax-add-block')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.addSyntaxBlockUI();
    });
    this.questionSearchInput?.addEventListener('input', () => this.filterBank());
    refreshExistingBtn?.addEventListener('click', () => this.loadProfessorQuizzes());
    newQuizBtn?.addEventListener('click', () => {
      this.resetBuilderUI();
      this.setDraftStatus('New quiz');
    });
    // Load existing quizzes initially
    this.loadProfessorQuizzes();

    // Bank load buttons
    document.querySelectorAll('.bank-load-btn').forEach(btn => {
      btn.addEventListener('click', () => this.loadBank(btn.getAttribute('data-bank')));
    });
  }

  openQuizModal() {
    if (!this.quizModal) return;
    this.quizModal.classList.remove('hidden');
    this.resetBuilderUI();
    // Refresh list on open
    this.loadProfessorQuizzes();
  }

  closeQuizModal() {
    if (this.quizModal) this.quizModal.classList.add('hidden');
  }

  resetBuilderUI() {
    this.quizDraft = { meta: {}, questions: [] };
    this.renderDraft();
    if (this.bankQuestionsContainer) this.bankQuestionsContainer.innerHTML = '';
    this.loadedBank = [];
    this.filteredBank = [];
    if (this.loadedBankCountEl) this.loadedBankCountEl.textContent = 'No bank loaded';
    this.activeBankKey = null;
    if (this.quizIdInput) this.quizIdInput.value = '';
    if (this.quizTitleInput) this.quizTitleInput.value = '';
    if (this.quizSubjectInput) this.quizSubjectInput.value = '';
    this.setDraftStatus('Idle');
    this.toggleCustomQuestionForm(false, true);
    if (this.quizIdInput) this.quizIdInput.disabled = false; // re-enable for new quiz
  }

  async loadBank(bankKey) {
    this.activeBankKey = bankKey;
    this.setDraftStatus(`Loading ${bankKey} questions...`);
    try {
      const map = { python: 'python.json', java: 'java.json', webdesign: 'webdesign.json' };
      const file = map[bankKey];
      if (!file) return;
      const base = (window.__APP_BASE__ || '/');
      // Vite serves `public/` at the web root, so omit `public/` in URLs
      const url = `${base}data/quizzes/${file}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
  const extracted = this.extractQuestionsFromQuizJSON(json);
      this.loadedBank = extracted;
      this.filteredBank = [...extracted];
      this.renderBank();
      if (this.loadedBankCountEl) this.loadedBankCountEl.textContent = `${extracted.length} loaded (${bankKey})`;
      this.setDraftStatus(`Loaded ${extracted.length} ${bankKey} questions`);
    } catch (e) {
      console.error('Bank load failed', e);
      this.showError('Failed to load question bank: ' + e.message);
      this.setDraftStatus('Bank load error');
    }
  }

  extractQuestionsFromQuizJSON(json) {
    const results = [];
    const pushMC = (q) => {
      results.push({ type: 'multipleChoice', question: q.question, options: q.options || q.choices, correctIndex: q.correctIndex ?? 0, bloomTarget: q.bloomTarget || '' });
    };
    const pushSB = (q) => {
      // ensure schema matches python.json
      results.push({ type: 'syntaxBlock', question: q.question, instruction: q.instruction || '', blocks: Array.isArray(q.blocks) ? q.blocks : [], bloomTarget: q.bloomTarget || '' });
    };
    const pushCA = (q) => {
      results.push({ type: 'codeArrangement', title: q.title || '', description: q.description || '', blocks: Array.isArray(q.blocks) ? q.blocks : [], correctOrder: Array.isArray(q.correctOrder) ? q.correctOrder : q.blocks?.map((_,i)=>i) || [], bloomTarget: q.bloomTarget || '' });
    };
    const processGroup = (group) => {
      if (!group || typeof group !== 'object') return;
      // explicit known arrays
      if (Array.isArray(group.multipleChoice)) group.multipleChoice.forEach(q => q?.question && (q.options||q.choices) && pushMC(q));
      if (Array.isArray(group.syntaxBlock)) group.syntaxBlock.forEach(q => q && Array.isArray(q.blocks) && pushSB(q));
      if (Array.isArray(group.codeArrangement)) group.codeArrangement.forEach(q => q && Array.isArray(q.blocks) && pushCA(q));
      // also scan any nested arrays for robustness
      Object.keys(group).forEach(k => {
        const v = group[k];
        if (Array.isArray(v)) {
          v.forEach(q => {
            if (!q || typeof q !== 'object') return;
            if (q.question && (q.options || q.choices)) return pushMC(q);
            if (q.type === 'syntaxBlock' || q.blocks) {
              // try to infer syntaxBlock (has blocks with code/correct shape)
              if (Array.isArray(q.blocks) && q.blocks.length && typeof q.blocks[0] === 'object' && 'code' in q.blocks[0]) return pushSB(q);
            }
          });
        }
      });
    };

    if (json.intensity1) processGroup(json.intensity1);
    if (json.intensity2) processGroup(json.intensity2);
    if (json.intensity3) processGroup(json.intensity3);
    if (Array.isArray(json.questions)) json.questions.forEach(q => q?.question && (q.options||q.choices) && pushMC(q));
    return results;
  }

  filterBank() {
    const term = (this.questionSearchInput?.value || '').toLowerCase();
    if (!term) {
      this.filteredBank = [...this.loadedBank];
    } else {
      this.filteredBank = this.loadedBank.filter(q => {
        if (q.type === 'multipleChoice') return q.question.toLowerCase().includes(term);
        if (q.type === 'syntaxBlock') return (q.question?.toLowerCase().includes(term) || q.instruction?.toLowerCase().includes(term));
        if (q.type === 'codeArrangement') return (q.title?.toLowerCase().includes(term) || q.description?.toLowerCase().includes(term));
        return false;
      });
    }
    this.renderBank();
  }

  renderBank() {
    if (!this.bankQuestionsContainer) return;
    this.bankQuestionsContainer.innerHTML = this.filteredBank.map((q, idx) => {
      if (q.type === 'multipleChoice') {
        return `
      <div class="group border border-gray-700 rounded-lg p-3 bg-dark/40 hover:bg-dark/60 transition relative">
        <div class="flex items-center justify-between mb-1">
          <p class="text-sm text-gray-200 font-medium">${q.question}</p>
          <span class="text-[10px] px-2 py-0.5 rounded bg-purple/30 border border-purple/40">Multiple Choice</span>
        </div>
        <div class="grid grid-cols-2 gap-1 text-[11px] text-gray-400 font-mono">
          ${q.options.map((o,i)=>`<span class="px-1 py-0.5 rounded ${i===q.correctIndex?'bg-green-700 text-green-200':'bg-gray-700/50'}">${String.fromCharCode(65+i)}. ${o}</span>`).join('')}
        </div>
        <button data-add-bank="${idx}" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition px-2 py-1 bg-primary text-dark rounded text-xs font-gaming">Add</button>
      </div>`;
      } else if (q.type === 'syntaxBlock') {
        const blockPreview = (q.blocks || []).slice(0,2).map(b=>`<pre class="text-[11px] bg-gray-800/70 p-2 rounded border border-gray-700 overflow-auto">${(b.code||'').replace(/</g,'&lt;')}</pre>`).join('');
        return `
      <div class="group border border-gray-700 rounded-lg p-3 bg-dark/40 hover:bg-dark/60 transition relative">
        <div class="flex items-center justify-between mb-1">
          <p class="text-sm text-gray-200 font-medium">${q.question}</p>
          <span class="text-[10px] px-2 py-0.5 rounded bg-cyan/30 border border-cyan/40">Syntax Block</span>
        </div>
        <p class="text-[11px] text-gray-400 mb-2">${q.instruction || ''}</p>
        <div class="space-y-1">${blockPreview}</div>
        <button data-add-bank="${idx}" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition px-2 py-1 bg-primary text-dark rounded text-xs font-gaming">Add</button>
      </div>`;
      } else if (q.type === 'codeArrangement') {
        const lines = (q.blocks || []).slice(0,3).map(l=>`<code class="block text-[11px] bg-gray-800/70 px-2 py-1 rounded border border-gray-700 overflow-auto">${(l||'').replace(/</g,'&lt;')}</code>`).join('');
        return `
      <div class="group border border-gray-700 rounded-lg p-3 bg-dark/40 hover:bg-dark/60 transition relative">
        <div class="flex items-center justify-between mb-1">
          <p class="text-sm text-gray-200 font-medium">${q.title || 'Arrange the code blocks'}</p>
          <span class="text-[10px] px-2 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30">Code Arrangement</span>
        </div>
        <p class="text-[11px] text-gray-400 mb-2">${q.description || ''}</p>
        <div class="space-y-1">${lines}</div>
        <button data-add-bank="${idx}" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition px-2 py-1 bg-primary text-dark rounded text-xs font-gaming">Add</button>
      </div>`;
      }
      return '';
    }).join('');

    this.bankQuestionsContainer.querySelectorAll('[data-add-bank]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.getAttribute('data-add-bank'));
        const q = this.filteredBank[i];
        if (q) {
          this.quizDraft.questions.push(JSON.parse(JSON.stringify(q))); // clone
          this.renderDraft();
          this.setDraftStatus('Question added from bank');
        }
      });
    });
  }

  renderDraft() {
    if (this.draftCountEl) this.draftCountEl.textContent = String(this.quizDraft.questions.length);
    if (!this.draftQuestionsContainer) return;

    if (this.quizDraft.questions.length === 0) {
      this.draftQuestionsContainer.innerHTML = `<div class="text-center text-gray-500 text-sm py-6">No questions added yet.</div>`;
      return;
    }
    this.draftQuestionsContainer.innerHTML = this.quizDraft.questions.map((q, idx) => {
      if (q.type === 'syntaxBlock') {
        const blockPreview = (q.blocks||[]).slice(0,2).map(b=>`<pre class="text-[11px] bg-gray-800/70 p-2 rounded border border-gray-700 overflow-auto">${(b.code||'').replace(/</g,'&lt;')}</pre>`).join('');
        return `
      <div class="border border-gray-700 rounded-lg p-3 bg-dark/50 relative group">
        <div class="flex justify-between items-start mb-1">
          <p class="text-sm font-medium text-gray-200 pr-2">${idx+1}. ${q.question}</p>
          <div class="flex items-center space-x-2">
            <span class="text-[10px] px-2 py-0.5 rounded bg-cyan/30 border border-cyan/40">Syntax Block</span>
            <div class="flex space-x-1 opacity-0 group-hover:opacity-100 transition">
              <button data-move-up="${idx}" class="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-[11px]">↑</button>
              <button data-move-down="${idx}" class="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-[11px]">↓</button>
              <button data-remove="${idx}" class="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-[11px]">✖</button>
            </div>
          </div>
        </div>
        <p class="text-[11px] text-gray-400 mb-2">${q.instruction || ''}</p>
        <div class="space-y-1">${blockPreview}</div>
      </div>`;
      } else if (q.type === 'codeArrangement') {
        const lines = (q.blocks||[]).slice(0,3).map(l=>`<code class=\"block text-[11px] bg-gray-800/70 px-2 py-1 rounded border border-gray-700 overflow-auto\">${(l||'').replace(/</g,'&lt;')}</code>`).join('');
        return `
      <div class="border border-gray-700 rounded-lg p-3 bg-dark/50 relative group">
        <div class="flex justify-between items-start mb-1">
          <p class="text-sm font-medium text-gray-200 pr-2">${idx+1}. ${q.title || 'Arrange the code blocks'}</p>
          <div class="flex items-center space-x-2">
            <span class="text-[10px] px-2 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30">Code Arrangement</span>
            <div class="flex space-x-1 opacity-0 group-hover:opacity-100 transition">
              <button data-move-up="${idx}" class="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-[11px]">↑</button>
              <button data-move-down="${idx}" class="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-[11px]">↓</button>
              <button data-remove="${idx}" class="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-[11px]">✖</button>
            </div>
          </div>
        </div>
        <p class="text-[11px] text-gray-400 mb-2">${q.description || ''}</p>
        <div class="space-y-1">${lines}</div>
      </div>`;
      }
      // default multiple choice
      return `
      <div class="border border-gray-700 rounded-lg p-3 bg-dark/50 relative group">
        <div class="flex justify-between items-start mb-1">
          <p class="text-sm font-medium text-gray-200 pr-2">${idx+1}. ${q.question}</p>
          <div class="flex items-center space-x-2">
            <span class="text-[10px] px-2 py-0.5 rounded bg-purple/30 border border-purple/40">Multiple Choice</span>
            <div class="flex space-x-1 opacity-0 group-hover:opacity-100 transition">
              <button data-move-up="${idx}" class="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-[11px]">↑</button>
              <button data-move-down="${idx}" class="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-[11px]">↓</button>
              <button data-remove="${idx}" class="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-[11px]">✖</button>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-1 text-[11px] font-mono">
          ${q.options.map((o,i)=>`<span class="px-1 py-0.5 rounded ${i===q.correctIndex?'bg-green-700 text-green-200':'bg-gray-700/60'}">${String.fromCharCode(65+i)}. ${o}</span>`).join('')}
        </div>
      </div>`;
    }).join('');

    this.draftQuestionsContainer.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.getAttribute('data-remove'));
        this.quizDraft.questions.splice(i,1);
        this.renderDraft();
        this.setDraftStatus('Removed question');
      });
    });
    this.draftQuestionsContainer.querySelectorAll('[data-move-up]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.getAttribute('data-move-up'));
        if (i>0) {
          const tmp = this.quizDraft.questions[i-1];
          this.quizDraft.questions[i-1] = this.quizDraft.questions[i];
          this.quizDraft.questions[i] = tmp;
          this.renderDraft();
        }
      });
    });
    this.draftQuestionsContainer.querySelectorAll('[data-move-down]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.getAttribute('data-move-down'));
        if (i < this.quizDraft.questions.length -1) {
          const tmp = this.quizDraft.questions[i+1];
          this.quizDraft.questions[i+1] = this.quizDraft.questions[i];
          this.quizDraft.questions[i] = tmp;
          this.renderDraft();
        }
      });
    });
  }

  toggleCustomQuestionForm(show, reset = false) {
    if (!this.customQuestionForm) return;
    if (show) {
      this.customQuestionForm.classList.remove('hidden');
      this.customQuestionText?.focus();
    } else {
      this.customQuestionForm.classList.add('hidden');
    }
    if (reset) {
      if (this.customQuestionType) this.customQuestionType.value = 'multipleChoice';
      if (this.customBloomTarget) this.customBloomTarget.value = '';
      if (this.customQuestionText) this.customQuestionText.value='';
      this.customOptionInputs?.forEach(inp=>inp.value='');
      if (this.customCorrectIndex) this.customCorrectIndex.value='0';
      if (this.syntaxQuestion) this.syntaxQuestion.value='';
      if (this.syntaxInstruction) this.syntaxInstruction.value='';
      // reset syntax blocks to 3
      if (this.syntaxBlocksWrap) {
        this.syntaxBlocksWrap.querySelectorAll('.dynamic-syntax-block')?.forEach(el=>el.remove());
        const radios = this.syntaxBlocksWrap.querySelectorAll('input[name="syntax-correct"]');
        radios.forEach(r=>{ r.checked = false; });
        const tas = this.syntaxBlocksWrap.querySelectorAll('.syntax-code-input');
        tas.forEach(t=>{ if (t) t.value=''; });
      }
      if (this.arrangeTitle) this.arrangeTitle.value='';
      if (this.arrangeDescription) this.arrangeDescription.value='';
      if (this.arrangeBlocks) this.arrangeBlocks.value='';
      this.updateCustomFormVisibility();
    }
  }

  updateCustomFormVisibility() {
    const type = this.customQuestionType?.value || 'multipleChoice';
    const mc = document.getElementById('form-mc');
    const sb = document.getElementById('form-syntax');
    const ca = document.getElementById('form-arrangement');
    if (mc) mc.classList.toggle('hidden', type !== 'multipleChoice');
    if (sb) sb.classList.toggle('hidden', type !== 'syntaxBlock');
    if (ca) ca.classList.toggle('hidden', type !== 'codeArrangement');
  }

  addSyntaxBlockUI() {
    if (!this.syntaxBlocksWrap) return;
    const idx = this.syntaxBlocksWrap.querySelectorAll('.dynamic-syntax-block').length + 3; // after first 3
    const div = document.createElement('div');
    div.className = 'p-2 border border-gray-700 rounded-lg bg-dark/50 dynamic-syntax-block';
    div.innerHTML = `
      <label class="text-xs text-gray-400 block mb-1">Block ${idx+1}</label>
      <textarea class="syntax-code-input w-full px-2 py-2 bg-dark/60 border border-gray-600 rounded text-white text-sm" rows="3"></textarea>
      <label class="inline-flex items-center mt-2 text-xs text-gray-300"><input type="radio" name="syntax-correct" class="mr-2" value="${idx}"> Correct</label>
    `;
    this.syntaxBlocksWrap.querySelector('.grid')?.appendChild(div);
  }

  addCustomQuestion() {
    const type = this.customQuestionType?.value || 'multipleChoice';
    const bloom = (this.customBloomTarget?.value || '').trim();
    if (type === 'syntaxBlock') {
      const question = (this.syntaxQuestion?.value || '').trim();
      const instruction = (this.syntaxInstruction?.value || '').trim();
      const codeInputs = Array.from(this.customQuestionForm.querySelectorAll('.syntax-code-input'));
      const blocks = codeInputs.map((ta, i) => ({ code: ta.value || '', correct: false })).filter(b=>b.code.trim() !== '');
      const correctRadio = this.customQuestionForm.querySelector('input[name="syntax-correct"]:checked');
      const correctIndex = correctRadio ? parseInt(correctRadio.value, 10) : -1;
      if (!question || blocks.length < 2 || correctIndex < 0 || correctIndex >= blocks.length) {
        this.showWarning('Provide question, at least 2 code blocks, and mark the correct one');
        return;
      }
      // mark correct
      blocks.forEach((b, i) => { b.correct = (i === correctIndex); });
      this.quizDraft.questions.push({ type: 'syntaxBlock', question, instruction, blocks, bloomTarget: bloom });
      this.renderDraft();
      this.toggleCustomQuestionForm(false, true);
      this.setDraftStatus('Custom syntaxBlock added');
      return;
    }
    if (type === 'codeArrangement') {
      const title = (this.arrangeTitle?.value || '').trim();
      const description = (this.arrangeDescription?.value || '').trim();
      const blocks = (this.arrangeBlocks?.value || '').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      if (!title || blocks.length < 2) {
        this.showWarning('Provide title and at least 2 lines for blocks');
        return;
      }
      const correctOrder = blocks.map((_, i) => i);
      this.quizDraft.questions.push({ type: 'codeArrangement', title, description, blocks, correctOrder, bloomTarget: bloom });
      this.renderDraft();
      this.toggleCustomQuestionForm(false, true);
      this.setDraftStatus('Custom codeArrangement added');
      return;
    }
    // default multipleChoice
    const text = (this.customQuestionText?.value || '').trim();
    const options = (this.customOptionInputs || []).map(i=>i.value.trim()).filter(v=>v);
    if (!text || options.length < 2) {
      this.showWarning('Provide question text and at least 2 options');
      return;
    }
    const correctIdx = parseInt(this.customCorrectIndex?.value || '0', 10);
    if (correctIdx >= options.length) {
      this.showWarning('Correct option index exceeds number of options');
      return;
    }
    this.quizDraft.questions.push({ type: 'multipleChoice', question: text, options, correctIndex: correctIdx, bloomTarget: bloom });
    this.renderDraft();
    this.toggleCustomQuestionForm(false, true);
    this.setDraftStatus('Custom question added');
  }

  clearDraft() {
    const confirmed = confirm('Clear current draft?');
    if (!confirmed) return;
    this.quizDraft.questions = [];
    this.renderDraft();
    this.setDraftStatus('Draft cleared');
  }

  setDraftStatus(msg) {
    if (this.draftStatusEl) this.draftStatusEl.textContent = msg;
  }

  async saveQuizDraft() {
    const rawId = (this.quizIdInput?.value || '').trim();
    const title = (this.quizTitleInput?.value || '').trim();
    const subject = (this.quizSubjectInput?.value || '').trim();
    if (!rawId || !title) {
      this.showWarning('Quiz ID and Title are required');
      return;
    }
    if (this.quizDraft.questions.length === 0) {
      this.showWarning('Add at least one question');
      return;
    }
    const authUser = (window.firebase?.auth && window.firebase.auth().currentUser) ? window.firebase.auth().currentUser : null;
    if (!authUser) {
      this.showError('No authenticated Firebase user. Please re-login.');
      return;
    }
    if (authUser.isAnonymous) {
      this.showError('Anonymous users cannot save quizzes. Please sign in with a professor/admin account.');
      return;
    }
    const ownerUid = authUser.uid; // path key
    const quizId = rawId.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'untitled-quiz';
    if (quizId !== rawId) this.showInfo(`Quiz ID normalized to: ${quizId}`);

    // Group by type
    const multipleChoice = this.quizDraft.questions.filter(q=>q.type==='multipleChoice' || (!q.type && q.options)).map(q => ({
      question: q.question,
      options: q.options,
      correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
      ...(q.bloomTarget ? { bloomTarget: q.bloomTarget } : {})
    }));
    const syntaxBlock = this.quizDraft.questions.filter(q=>q.type==='syntaxBlock').map(q => ({
      type: 'syntaxBlock',
      question: q.question,
      instruction: q.instruction || '',
      blocks: q.blocks || [],
      ...(q.bloomTarget ? { bloomTarget: q.bloomTarget } : {})
    }));
    const codeArrangement = this.quizDraft.questions.filter(q=>q.type==='codeArrangement').map(q => ({
      title: q.title || '',
      description: q.description || '',
      blocks: q.blocks || [],
      correctOrder: Array.isArray(q.correctOrder) ? q.correctOrder : (q.blocks||[]).map((_,i)=>i),
      ...(q.bloomTarget ? { bloomTarget: q.bloomTarget } : {})
    }));

    const payload = {
      meta: {
        title,
        subject: subject || 'Custom',
        createdAt: new Date().toISOString(),
        createdBy: ownerUid,
        format: 'intensity-schema-v1'
      },
      intensity1: {}
    };
    if (multipleChoice.length) payload.intensity1.multipleChoice = multipleChoice;
    if (syntaxBlock.length) payload.intensity1.syntaxBlock = syntaxBlock;
    if (codeArrangement.length) payload.intensity1.codeArrangement = codeArrangement;
    let success = false;
    if (this.isFirebaseInitialized) {
      const path = `customQuizzes/${ownerUid}/${quizId}`;
      try {
        await this.database.ref(path).set(payload);
        success = true;
        this.loadProfessorQuizzes();
      } catch (e) {
        console.error('Firebase save failed', e);
        if (/PERMISSION_DENIED|permission_denied/i.test(e.message)) {
          this.showError('Permission denied. Check rules: auth.uid must match path and have professor/admin claim.');
          authUser.getIdTokenResult?.().then(r=>console.warn('Current claims:', r.claims));
        } else {
          this.showError('Failed to save to Firebase (see console).');
        }
      }
    }
    if (success) {
      this.showSuccess('Custom quiz saved!');
      this.setDraftStatus('Saved ✓');
    }
  }

  /* =============================
     EXISTING QUIZ MANAGEMENT
  ============================= */
  async loadProfessorQuizzes() {
    if (!this.database) return;
    const authUser = (window.firebase?.auth && window.firebase.auth().currentUser) ? window.firebase.auth().currentUser : null;
    if (!authUser || authUser.isAnonymous) {
      if (this.existingQuizzesStatus) this.existingQuizzesStatus.textContent = 'Sign in to load quizzes';
      return;
    }
    const ownerUid = authUser.uid;
    this.loadingExisting = true;
    if (this.existingQuizzesStatus) this.existingQuizzesStatus.textContent = 'Loading...';
    try {
      const snap = await this.database.ref(`customQuizzes/${ownerUid}`).once('value');
      if (!snap.exists()) {
        this.existingQuizzes = {};
        if (this.existingQuizzesStatus) this.existingQuizzesStatus.textContent = 'No quizzes yet';
        this.renderExistingQuizzes();
        return;
      }
      this.existingQuizzes = snap.val();
      if (this.existingQuizzesStatus) this.existingQuizzesStatus.textContent = Object.keys(this.existingQuizzes).length + ' quiz(es)';
      this.renderExistingQuizzes();
    } catch (e) {
      console.error('Load existing quizzes failed', e);
      if (this.existingQuizzesStatus) this.existingQuizzesStatus.textContent = 'Failed to load';
    } finally {
      this.loadingExisting = false;
    }
  }

  renderExistingQuizzes() {
    if (!this.existingQuizzesContainer) return;
    const entries = Object.entries(this.existingQuizzes || {});
    if (entries.length === 0) {
      this.existingQuizzesContainer.innerHTML = '<div class="text-gray-500 text-xs">None yet.</div>';
      return;
    }
    this.existingQuizzesContainer.innerHTML = entries.map(([quizId, data]) => {
      const title = data.meta?.title || quizId;
      const subject = data.meta?.subject || 'Custom';
      const countMC = (data.intensity1?.multipleChoice || []).length;
      const countSB = (data.intensity1?.syntaxBlock || []).length;
      const countCA = (data.intensity1?.codeArrangement || []).length;
      const count = countMC + countSB + countCA;
      return `
        <div class="group border border-gray-700 rounded-lg p-3 bg-dark/40 hover:bg-dark/60 transition relative">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm text-gray-200 font-medium">${title}</p>
              <p class="text-xs text-gray-400 font-mono">ID: ${quizId} • ${subject} • ${count} Qs</p>
            </div>
            <div class="flex space-x-1 opacity-0 group-hover:opacity-100 transition">
              <button data-edit-quiz="${quizId}" class="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-[11px]">Edit</button>
              <button data-delete-quiz="${quizId}" class="px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-[11px]">Del</button>
            </div>
          </div>
        </div>`;
    }).join('');

    this.existingQuizzesContainer.querySelectorAll('[data-edit-quiz]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-quiz');
        this.editExistingQuiz(id);
      });
    });
    this.existingQuizzesContainer.querySelectorAll('[data-delete-quiz]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-quiz');
        this.deleteExistingQuiz(id);
      });
    });
  }

  editExistingQuiz(quizId) {
    const data = this.existingQuizzes[quizId];
    if (!data) return;
    if (this.quizIdInput) {
      this.quizIdInput.value = quizId;
      this.quizIdInput.disabled = true; // prevent changing id while editing
    }
    if (this.quizTitleInput) this.quizTitleInput.value = data.meta?.title || '';
    if (this.quizSubjectInput) this.quizSubjectInput.value = data.meta?.subject || '';
    const mc = (data.intensity1?.multipleChoice || []).map(q => ({ type: 'multipleChoice', question: q.question, options: q.options || [], correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0, bloomTarget: q.bloomTarget || '' }));
    const sb = (data.intensity1?.syntaxBlock || []).map(q => ({ type: 'syntaxBlock', question: q.question, instruction: q.instruction || '', blocks: q.blocks || [], bloomTarget: q.bloomTarget || '' }));
    const ca = (data.intensity1?.codeArrangement || []).map(q => ({ type: 'codeArrangement', title: q.title || '', description: q.description || '', blocks: q.blocks || [], correctOrder: Array.isArray(q.correctOrder) ? q.correctOrder : (q.blocks||[]).map((_,i)=>i), bloomTarget: q.bloomTarget || '' }));
    const questions = [...mc, ...sb, ...ca];
    this.quizDraft = { meta: { ...data.meta }, questions };
    this.renderDraft();
    this.setDraftStatus(`Editing quiz: ${quizId}`);
    this.showInfo('Editing existing quiz. Save to apply changes.');
  }

  async deleteExistingQuiz(quizId) {
    const confirmDel = confirm(`Delete quiz '${quizId}'? This cannot be undone.`);
    if (!confirmDel) return;
    const authUser = (window.firebase?.auth && window.firebase.auth().currentUser) ? window.firebase.auth().currentUser : null;
    if (!authUser || authUser.isAnonymous) {
      this.showError('Not authenticated.');
      return;
    }
    try {
      await this.database.ref(`customQuizzes/${authUser.uid}/${quizId}`).remove();
      delete this.existingQuizzes[quizId];
      this.renderExistingQuizzes();
      this.showSuccess('Quiz deleted');
      if (this.quizIdInput && this.quizIdInput.value === quizId) {
        this.resetBuilderUI();
      }
    } catch (e) {
      console.error('Delete failed', e);
      this.showError('Failed to delete quiz');
    }
  }
  /* =============================
     END QUIZ BUILDER
  ============================== */

  async initializeFirebase() {
    try {
      // If already initialized elsewhere, reuse it
      if (window.firebase?.apps?.length) {
        this.database = window.firebase.database();
        this.isFirebaseInitialized = true;
        return;
      }

      // Prefer site-wide config manager if available (used on leaderboards)
      const maybeInitViaManager = async () => {
        if (window.firebaseConfig && typeof window.firebaseConfig.initializeFirebase === 'function') {
          try {
            await window.firebaseConfig.initializeFirebase();
            return true;
          } catch (e) {
            console.warn('[professor-dashboard] Site firebaseConfig initialize failed:', e?.message || e);
          }
        } else {
          // Try to dynamically load it
          try {
            await new Promise((resolve, reject) => {
              const s = document.createElement('script');
              s.src = './config/firebase-config.js';
              s.async = true;
              s.onload = resolve;
              s.onerror = reject;
              document.head.appendChild(s);
            });
            if (window.firebaseConfig && typeof window.firebaseConfig.initializeFirebase === 'function') {
              await window.firebaseConfig.initializeFirebase();
              return true;
            }
          } catch (_) { /* fallthrough */ }
        }
        return false;
      };

      const initedByManager = await maybeInitViaManager();

      if (!initedByManager && (!window.firebase?.apps?.length)) {
        // Fallback to env-config.json direct
        try {
          const cacheBuster = `?_v=${Date.now()}`;
          const res = await fetch('./config/env-config.json' + cacheBuster, { cache: 'no-store' });
          if (res.ok) {
            const envConfig = await res.json();
            const firebaseConfig = {
              apiKey: envConfig.apiKey || envConfig.FIREBASE_API_KEY,
              authDomain: envConfig.authDomain || envConfig.FIREBASE_AUTH_DOMAIN,
              databaseURL: envConfig.databaseURL || envConfig.FIREBASE_DATABASE_URL,
              projectId: envConfig.projectId || envConfig.FIREBASE_PROJECT_ID,
              storageBucket: envConfig.storageBucket || envConfig.FIREBASE_STORAGE_BUCKET,
              messagingSenderId: envConfig.messagingSenderId || envConfig.FIREBASE_MESSAGING_SENDER_ID,
              appId: envConfig.appId || envConfig.FIREBASE_APP_ID
            };
            if (firebaseConfig.apiKey && (firebaseConfig.databaseURL || firebaseConfig.projectId)) {
              window.firebase.initializeApp(firebaseConfig);
            }
          }
        } catch (e) {
          console.warn('[professor-dashboard] env-config.json load failed:', e?.message || e);
        }
      }

      // Final fallback identical to leaderboards client
      if (!window.firebase?.apps?.length) {
        const fallbackConfig = {
          apiKey: 'AIzaSyD-Q2woACHgMCTVwd6aX-IUzLovE0ux-28',
          authDomain: 'sci-high-website.firebaseapp.com',
          databaseURL: 'https://sci-high-website-default-rtdb.asia-southeast1.firebasedatabase.app',
          projectId: 'sci-high-website',
          storageBucket: 'sci-high-website.appspot.com',
          messagingSenderId: '451463202515',
          appId: '1:451463202515:web:e7f9c7bf69c04c685ef626'
        };
        try {
          window.firebase.initializeApp(fallbackConfig);
          console.info('[professor-dashboard] Initialized with fallback Firebase config.');
        } catch (e) {
          console.error('[professor-dashboard] Fallback Firebase init failed:', e);
        }
      }

      if (window.firebase?.apps?.length) {
        this.database = window.firebase.database();
        this.isFirebaseInitialized = true;
        try {
          this.database.ref('.info/connected').on('value', (snapshot) => {
            if (snapshot.val() !== true) {
              this.showWarning('Connection to Firebase lost. Some features may not work properly.');
            }
          });
        } catch(_) {}
      } else {
        this.isFirebaseInitialized = false;
      }
    } catch (error) {
      console.error('Firebase initialization error:', error);
      this.isFirebaseInitialized = false;
    }
  }

  async loadStudents() {
    try {
      if (!this.isFirebaseInitialized) {
        console.warn('Firebase not initialized, loading sample data');
        this.loadSampleData();
        this.renderAnalytics();
        return;
      }

      // 1) Fetch career stats first (primary source)
      const careerSnap = await this.database.ref('student_career_stats').once('value').catch(() => ({ val: () => null }));
      const careerData = careerSnap && typeof careerSnap.val === 'function' ? (careerSnap.val() || {}) : {};

      // Build initial list from career only
      const buildName = (sid, sObj, cObj) => {
        if (sObj) {
          const full = `${sObj.firstName || ''} ${sObj.lastName || ''}`.trim();
          if (full) return full;
          if (sObj.fullName) return sObj.fullName;
          if (sObj.name) return sObj.name;
        }
        if (cObj) {
          const info = cObj.studentInfo || cObj.info || cObj.profile || {};
          if (info.fullName) return info.fullName;
          if (cObj.fullName) return cObj.fullName;
          if (info.studentName) return info.studentName;
          if (cObj.name) return cObj.name;
        }
        return `Student ${sid}`;
      };

      const ids = Object.keys(careerData || {});
      const baseStudents = ids.map(studentId => {
        const rawCareer = careerData[studentId] || null;
        const career = this.normalizeCareer(rawCareer) || {};
        const strandYear = rawCareer?.strandYear || '';
        let { strand, year } = this.parseStrandYear(strandYear);
        const dept = this.deptTypeFromString(rawCareer?.department || (rawCareer?.studentInfo?.department) || '');
        const departmentLabel = rawCareer?.department || (rawCareer?.studentInfo?.department) || (dept === 'college' ? 'College Department' : 'Senior High');
        const lastLogin = this.deriveLastActive(rawCareer) || null;
        const fullName = buildName(studentId, null, rawCareer);
        return {
          id: studentId,
          studentId,
          fullName,
          academicInfo: {
            level: dept === 'college' ? 'college' : 'shs',
            strand: strand || 'N/A',
            year: year || 'N/A',
            course: strandYear || 'N/A',
            yearLevel: strandYear || 'N/A',
            department: departmentLabel || 'N/A'
          },
          accountStatus: {
            createdBy: 'system',
            lastLogin,
            isFirstLogin: !lastLogin
          },
          gameData: {
            totalPoints: (career.totalPoints || 0),
            courseProgress: {}
          },
          career
        };
      });

      // Determine if enrichment is necessary (missing names or strandYear)
      const needsEnrichment = baseStudents.some(s => !s.fullName || /Student\s+/i.test(s.fullName) || (!s.academicInfo.course || s.academicInfo.course === 'N/A'));

      let studentsData = null;
      if (needsEnrichment) {
        try {
          const studentsSnap = await this.database.ref('students').once('value');
          studentsData = studentsSnap.val() || null;
        } catch(_) { /* optional enrichment */ }
      }

      // Enrich fields from students if available
      this.students = baseStudents.map(s => {
        const student = studentsData ? studentsData[s.id] : null;
        if (!student) return s;
        const strandYear = student.strandYear || s.academicInfo.yearLevel || '';
        let strand = student.strand || s.academicInfo.strand;
        let year = student.year || s.academicInfo.year;
        if ((!strand || !year) && strandYear) {
          const p = this.parseStrandYear(strandYear);
          strand = strand || p.strand;
          year = year || p.year;
        }
        const fullName = (function(){
          const built = `${student.firstName || ''} ${student.lastName || ''}`.trim();
          return built || student.fullName || s.fullName;
        })();
        return {
          ...s,
          studentId: student.studentId || s.studentId,
          fullName,
          academicInfo: {
            ...s.academicInfo,
            strand: strand || s.academicInfo.strand,
            year: year || s.academicInfo.year,
            course: strandYear || s.academicInfo.course,
            yearLevel: strandYear || s.academicInfo.yearLevel,
            department: student.department || s.academicInfo.department
          },
          accountStatus: {
            ...s.accountStatus,
            lastLogin: student.lastLogin || s.accountStatus.lastLogin,
            isFirstLogin: !(student.lastLogin)
          },
          gameData: {
            ...s.gameData,
            courseProgress: student.courseProgress || s.gameData.courseProgress
          }
        };
      });

      this.filteredStudents = [...this.students];
      this.visibleCount = Math.min(this.pageSize, this.filteredStudents.length);
      this.renderStudentsTable();
      this.renderAnalytics();

    } catch (error) {
      console.error('Error loading students from Firebase:', error);
      if (error && /permission_denied/.test(error.message)) {
        this.showError('Access denied to students data. Ensure this account is authenticated and has professor privileges.');
      } else {
        this.showError('Failed to load students from database. Loading sample data instead.');
        this.loadSampleData();
        this.renderAnalytics();
      }
    }
  }

  // Normalize various shapes of career stats into a common object
  normalizeCareer(statsData) {
    if (!statsData || typeof statsData !== 'object') return null;
    const rawCareer = statsData.careerStats || statsData.career || statsData;
    const totalPoints = rawCareer.totalPoints || rawCareer.score || rawCareer.points || statsData.totalPoints || statsData.score || 0;
    const courseCompletionStatus = rawCareer.courseCompletionStatus || statsData.courseCompletionStatus || {};
    const totalSessions = rawCareer.totalSessions || statsData.totalSessions || 0;
    const averageAccuracy = rawCareer.averageAccuracy || statsData.averageAccuracy || 0;
    const totalQuestions = rawCareer.totalQuestions || statsData.totalQuestions || 0;
    const totalCorrectAnswers = rawCareer.totalCorrectAnswers || statsData.totalCorrectAnswers || 0;
    const highestStreak = rawCareer.highestStreak || statsData.highestStreak || 0;
    return { totalPoints, courseCompletionStatus, totalSessions, averageAccuracy, totalQuestions, totalCorrectAnswers, highestStreak };
  }

  async ensureFirebaseAuth() {
    if (!this.isFirebaseInitialized || !window.firebase?.auth) return;
    return new Promise(resolve => {
      let resolved = false;
      window.firebase.auth().onAuthStateChanged(user => {
        if (!resolved) {
          resolved = true;
          if (user) {
            user.getIdTokenResult?.().then(r=>{
              console.log('Firebase auth user loaded. Claims:', r.claims);
            }).catch(err=>console.warn('Failed to read token claims', err));
          } else {
            console.log('No Firebase auth user (public/anonymous mode)');
          }
          resolve(user || null);
        }
      });
      setTimeout(()=>{ if(!resolved){ resolved=true; resolve(null);} }, 3000);
    });
  }

  parseStrandYear(strandYear) {
    let strand = '';
    let year = '';
    const yearMatch = strandYear.match(/(\d+)(st|nd|rd|th)/i);
    if (yearMatch) {
      year = yearMatch[1] + (yearMatch[2] || '');
    } else if (strandYear.includes('Grade')) {
      const gradeMatch = strandYear.match(/Grade\s*(\d+)/i);
      if (gradeMatch) {
        year = `Grade ${gradeMatch[1]}`;
      }
    }
    if (strandYear.includes('BSCS') || strandYear.includes('BS CS') || strandYear.includes('Computer Science')) {
      strand = 'BSCS';
    } else if (strandYear.includes('BSIT') || strandYear.includes('BS IT') || strandYear.includes('Information Technology')) {
      strand = 'BSIT';
    } else if (strandYear.includes('ICT')) {
      strand = 'ICT';
    } else if (strandYear.includes('STEM')) {
      strand = 'STEM';
    } else if (strandYear.includes('ABM')) {
      strand = 'ABM';
    } else if (strandYear.includes('HUMSS')) {
      strand = 'HUMSS';
    }
    return { strand, year };
  }

  loadSampleData() {
    this.students = [
      {
        id: 'stud_sample_001',
        studentId: '24-2024-001',
        fullName: 'Juan Dela Cruz',
        academicInfo: {
          level: 'college',
          strand: 'BSCS',
          year: '3rd',
          course: 'BS Computer Science',
          yearLevel: '3rd Year'
        },
        accountStatus: {
          createdBy: 'sample',
          lastLogin: new Date(Date.now() - 5*24*60*60*1000).toISOString(),
          isFirstLogin: false
        },
        gameData: {
          totalPoints: 850,
          courseProgress: {
            python: { progress: 75, completed: 8, total: 12 },
            javascript: { progress: 60, completed: 6, total: 10 }
          }
        }
      },
      {
        id: 'stud_sample_002',
        studentId: '24-2024-002',
        fullName: 'Maria Santos',
        academicInfo: {
          level: 'college',
          strand: 'BSIT',
          year: '2nd',
          course: 'BS Information Technology',
          yearLevel: '2nd Year'
        },
        accountStatus: {
          createdBy: 'sample',
          lastLogin: new Date(Date.now() - 12*24*60*60*1000).toISOString(),
          isFirstLogin: false
        },
        gameData: {
          totalPoints: 1200,
          courseProgress: {
            python: { progress: 90, completed: 11, total: 12 },
            webdesign: { progress: 85, completed: 9, total: 10 }
          }
        }
      }
    ];

    this.filteredStudents = [...this.students];
    this.visibleCount = Math.min(this.pageSize, this.filteredStudents.length);
    this.renderStudentsTable();
  }

  // Methods for student management
  filterStudents() {
    const searchTerm = (document.getElementById('search-students')?.value || '').toLowerCase();
    const strandFilter = document.getElementById('filter-strand')?.value || '';
    const yearFilter = document.getElementById('filter-year')?.value || '';
    const sortBy = document.getElementById('sort-by')?.value || 'name';

    this.filteredStudents = this.students.filter(student => {
      const matchesSearch = !searchTerm || 
        student.studentId.toLowerCase().includes(searchTerm) ||
        student.fullName.toLowerCase().includes(searchTerm);
      
      const matchesStrand = !strandFilter || 
        student.academicInfo.strand === strandFilter ||
        (student.academicInfo.course && student.academicInfo.course.includes(strandFilter));

      const matchesYear = !yearFilter || 
        student.academicInfo.year === yearFilter ||
        student.academicInfo.yearLevel === yearFilter ||
        student.academicInfo.yearLevel === `${yearFilter} Year`;

      return matchesSearch && matchesStrand && matchesYear;
    });

    // Sort the filtered results
    this.filteredStudents.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.fullName.localeCompare(b.fullName);
        case 'studentId':
          return a.studentId.localeCompare(b.studentId);
        case 'progress':
          return this.calculateProgress(b) - this.calculateProgress(a);
        case 'lastActive':
          const aDate = a.accountStatus.lastLogin ? new Date(a.accountStatus.lastLogin) : new Date(0);
          const bDate = b.accountStatus.lastLogin ? new Date(b.accountStatus.lastLogin) : new Date(0);
          return bDate - aDate;
        case 'points':
          const aPoints = a.gameData?.totalPoints || 0;
          const bPoints = b.gameData?.totalPoints || 0;
          return bPoints - aPoints;
        default:
          return 0;
      }
    });

    // Reset pagination for new filter result
    this.visibleCount = Math.min(this.pageSize, this.filteredStudents.length);
    this.renderStudentsTable();
    this.renderAnalytics();
  }

  renderStudentsTable() {
    const tbody = document.getElementById('students-table-body');
    if (!tbody) return;

    const total = this.filteredStudents.length;
    const dataToRender = this.filteredStudents.slice(0, Math.max(0, this.visibleCount));

    if (total === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-gray-400">
            No students found
          </td>
        </tr>
      `;
      // Hide pagination when no data
      if (this.paginationBarEl) this.paginationBarEl.style.display = 'none';
      return;
    }

    if (dataToRender.length === 0) {
      // In case visibleCount is 0 for some reason, render nothing but keep footer consistent
      tbody.innerHTML = '';
      if (this.paginationInfoEl) this.paginationInfoEl.textContent = `Showing 0 of ${total}`;
      if (this.paginationBarEl) this.paginationBarEl.style.display = (total > this.pageSize) ? 'flex' : 'none';
      if (this.loadMoreBtn) this.loadMoreBtn.style.display = (0 < total) ? 'inline-block' : 'none';
      return;
    }

    tbody.innerHTML = dataToRender.map(student => `
      <tr class="border-b border-gray-700 hover:bg-dark/20">
        <td class="py-3 px-4 font-mono">${student.studentId}</td>
        <td class="py-3 px-4">${student.fullName}</td>
        <td class="py-3 px-4">
          ${student.academicInfo.strand || 
            (student.academicInfo.level === 'college' ? 
              student.academicInfo.course : 
              student.academicInfo.strand)}
        </td>
        <td class="py-3 px-4">
          ${student.academicInfo.year ? `${student.academicInfo.year} Year` : student.academicInfo.yearLevel}
        </td>
        <td class="py-3 px-4">
          <div class="w-full bg-gray-700 rounded-full h-2">
            <div class="bg-primary h-2 rounded-full" style="width: ${this.calculateProgress(student)}%"></div>
          </div>
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>${this.calculateProgress(student)}%</span>
            <span>${student.gameData?.totalPoints || 0} pts</span>
          </div>
        </td>
        <td class="py-3 px-4 text-sm text-gray-400">
          ${student.accountStatus.lastLogin ? 
            new Date(student.accountStatus.lastLogin).toLocaleDateString() : 
            'Never'}
        </td>
        <td class="py-3 px-4">
          <div class="flex space-x-2">
            <button onclick="dashboard.viewStudent('${student.id}')" 
                    class="px-2 py-1 bg-cyan text-white text-xs rounded hover:bg-cyan/80">
              View
            </button>
            <button onclick="dashboard.resetProgress('${student.id}')" 
                    class="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700">
              Reset
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Update pagination bar visibility and info
    const showing = dataToRender.length;
    if (this.paginationInfoEl) this.paginationInfoEl.textContent = `Showing ${showing} of ${total}`;
    if (this.paginationBarEl) this.paginationBarEl.style.display = (total > this.pageSize) ? 'flex' : 'none';
    if (this.loadMoreBtn) this.loadMoreBtn.style.display = (showing < total) ? 'inline-block' : 'none';
  }

  calculateProgress(student) {
    // Use detailed per-course progress if available
    if (student?.gameData?.courseProgress) {
      const courses = Object.values(student.gameData.courseProgress);
      if (courses.length > 0) {
        const totalProgress = courses.reduce((sum, course) => sum + (course.progress || 0), 0);
        return Math.round(totalProgress / courses.length);
      }
    }
    // Fallback: derive from career courseCompletionStatus if present
    if (student?.career?.courseCompletionStatus && typeof student.career.courseCompletionStatus === 'object') {
      const entries = Object.values(student.career.courseCompletionStatus);
      const total = entries.length;
      if (total > 0) {
        const completed = entries.filter(Boolean).length;
        return Math.round((completed / total) * 100);
      }
    }
    return 0;
  }

  // Helpers to improve data quality from career stats
  deptTypeFromString(dept) {
    if (!dept) return 'other';
    const d = String(dept).toLowerCase();
    if (d.includes('college')) return 'college';
    if (d.includes('senior')) return 'seniorhigh';
    if (d.includes('junior')) return 'juniorhigh';
    return 'other';
  }

  deriveLastActive(rawCareer) {
    try {
      if (!rawCareer) return null;
      if (rawCareer.lastUpdated) return rawCareer.lastUpdated;
      const sessions = rawCareer.recentSessions || (rawCareer.careerStats && rawCareer.careerStats.recentSessions) || {};
      let latest = 0;
      Object.values(sessions).forEach(s => {
        const t = (s && (s.endTime || s.time || s.timestamp)) ? new Date(s.endTime || s.time || s.timestamp).getTime() : 0;
        if (t > latest) latest = t;
      });
      return latest ? new Date(latest).toISOString() : null;
    } catch(_) { return null; }
  }

  /* =============================
     Analytics
  ============================== */
  computeAnalytics(students) {
    const total = students.length;
    const avgProgress = total ? Math.round(students.reduce((s, st) => s + this.calculateProgress(st), 0) / total) : 0;
    const now = Date.now();
    const active7d = students.filter(s => {
      if (!s.accountStatus?.lastLogin) return false;
      return (now - new Date(s.accountStatus.lastLogin).getTime()) <= 7*24*60*60*1000;
    }).length;
    const avgPoints = total ? Math.round(students.reduce((s, st) => s + (st.gameData?.totalPoints || 0), 0) / total) : 0;

    // Strand distribution
    const strandCounts = {};
    students.forEach(s => {
      const key = this.getStrandOrCourseLabel(s);
      strandCounts[key] = (strandCounts[key] || 0) + 1;
    });

    // Progress bands: 0-24, 25-49, 50-74, 75-100
    const bands = [0,0,0,0];
    students.forEach(s => {
      const p = this.calculateProgress(s);
      if (p < 25) bands[0]++; else if (p < 50) bands[1]++; else if (p < 75) bands[2]++; else bands[3]++;
    });

    return { total, avgProgress, active7d, avgPoints, strandCounts, bands };
  }

  // Prefer explicit strand; if missing, use normalized course for college to avoid 'N/A' in analytics
  getStrandOrCourseLabel(student) {
    try {
      const info = student?.academicInfo || {};
      let strand = (info.strand || '').trim();
      const course = (info.course || '').trim();
      const level = (info.level || '').toLowerCase();
      // If we already have a clear strand, use it
      if (strand && strand !== 'N/A') return this.normalizeStrandName(strand);
      // Fall back: for college or when strand missing, try course text
      if (course) return this.normalizeStrandName(course);
      // Last resort: try yearLevel if it embeds the course/strand
      const yl = (info.yearLevel || '').trim();
      if (yl) return this.normalizeStrandName(yl);
      return 'N/A';
    } catch(_) {
      return 'N/A';
    }
  }

  // Map common course/strand strings to canonical short labels
  normalizeStrandName(text) {
    const t = String(text || '').toUpperCase();
    // Common aliases for college
    if (t.includes('BSCS') || t.includes('COMPUTER SCIENCE')) return 'BSCS';
    if (t.includes('BS IT') || t.includes('BSIT') || t.includes('INFORMATION TECHNOLOGY')) return 'BSIT';
    // SHS strands
    if (t.includes('ICT')) return 'ICT';
    if (t.includes('STEM')) return 'STEM';
    if (t.includes('ABM')) return 'ABM';
    if (t.includes('HUMSS')) return 'HUMSS';
    // If text looks like a short label already, return as-is (trim to avoid long phrases)
    if (t.length <= 8) return t || 'N/A';
    // Try to extract a reasonable token from long course names
    const token = t.split(/\s+/)[0];
    return token || 'N/A';
  }

  renderAnalytics() {
    const students = this.filteredStudents.length ? this.filteredStudents : this.students;
    const an = this.computeAnalytics(students);

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val); };
    setText('an-total-students', an.total);
    setText('an-avg-progress', `${an.avgProgress}%`);
    const bar = document.getElementById('an-avg-progress-bar');
    if (bar) bar.style.width = `${an.avgProgress}%`;
    setText('an-active-7d', an.active7d);
    setText('an-avg-points', an.avgPoints);

    // Optional insights: low progress and inactive 14d
    const lowProgressCount = Array.isArray(an.bands) ? (an.bands[0] || 0) : 0; // <25%
    const now = Date.now();
    const inactive14 = students.filter(s => {
      if (!s.accountStatus?.lastLogin) return true; // never logged in counts as inactive
      return (now - new Date(s.accountStatus.lastLogin).getTime()) > 14*24*60*60*1000;
    }).length;
    setText('an-insight-low-progress', `${lowProgressCount} at-risk (progress < 25%)`);
    setText('an-insight-inactive14', `${inactive14} inactive (no login in 14+ days)`);

    // Charts
    if (window.Chart) {
      // Strand chart (bar)
      const strandCtx = document.getElementById('chart-strand');
      if (strandCtx) {
        const labels = Object.keys(an.strandCounts);
        const data = Object.values(an.strandCounts);
        if (this._charts.strand) { this._charts.strand.destroy(); }
        this._charts.strand = new Chart(strandCtx, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Students',
              data,
              backgroundColor: 'rgba(244, 206, 20, 0.6)',
              borderColor: 'rgba(244, 206, 20, 1)',
              borderWidth: 1
            }]
          },
          options: {
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,0.06)' } },
              y: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,0.06)' } }
            }
          }
        });
      }

      // Progress bands chart (doughnut)
      const progressCtx = document.getElementById('chart-progress');
      if (progressCtx) {
        if (this._charts.progress) { this._charts.progress.destroy(); }
        this._charts.progress = new Chart(progressCtx, {
          type: 'doughnut',
          data: {
            labels: ['0-24%', '25-49%', '50-74%', '75-100%'],
            datasets: [{
              data: an.bands,
              backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(255, 159, 64, 0.6)',
                'rgba(54, 162, 235, 0.6)',
                'rgba(34, 197, 94, 0.6)'
              ],
              borderColor: 'rgba(255,255,255,0.2)'
            }]
          },
          options: {
            plugins: { legend: { labels: { color: '#cbd5e1' } } }
          }
        });
      }
    }
  }

  exportFilteredToCSV() {
    const rows = [
      ['Student ID','Full Name','Strand','Year','Progress %','Total Points','Last Login']
    ];
    const data = this.filteredStudents.length ? this.filteredStudents : this.students;
    data.forEach(s => {
      rows.push([
        s.studentId,
        s.fullName,
        s.academicInfo?.strand || '',
        s.academicInfo?.year || s.academicInfo?.yearLevel || '',
        String(this.calculateProgress(s)),
        String(s.gameData?.totalPoints || 0),
        s.accountStatus?.lastLogin ? new Date(s.accountStatus.lastLogin).toISOString() : ''
      ]);
    });

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    link.download = `students-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.showSuccess('Exported CSV for current list.');
  }

  showSuccess(message) {
    window.showSuccess?.(message, { title: 'Success' });
  }

  showError(message) {
    window.showError?.(message, { title: 'Error' });
  }

  showWarning(message) {
    window.showWarning?.(message, { title: 'Warning' });
  }

  showInfo(message) {
    window.showInfo?.(message, { title: 'Information' });
  }

  // Global methods for inline onclick handlers
  viewStudent(studentId) {
    const student = this.students.find(s => s.id === studentId);
    if (student) {
      this.showInfo(`Student Details:\n\nName: ${student.fullName}\nID: ${student.studentId}\nStrand: ${student.academicInfo.strand}\nYear: ${student.academicInfo.year}\nTotal Points: ${student.gameData?.totalPoints || 0}\nProgress: ${this.calculateProgress(student)}%`);
    }
  }

  async resetProgress(studentId) {
    const confirmed = await window.modernConfirm?.('Reset all progress for this student? This action cannot be undone.', {
      title: 'Reset Student Progress',
      type: 'warning',
      confirmText: 'Yes, Reset',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;

    try {
      if (this.isFirebaseInitialized) {
        const studentRef = this.database.ref(`students/${studentId}`);
        await studentRef.update({
          totalPoints: 0,
          courseProgress: {},
          lastUpdated: new Date().toISOString()
        });
      }
      const student = this.students.find(s => s.id === studentId);
      if (student) {
        student.gameData = { totalPoints: 0, courseProgress: {} };
        this.renderStudentsTable();
        this.renderAnalytics();
      }
      this.showSuccess('Student progress has been reset successfully.');
    } catch (error) {
      console.error('Error resetting student progress:', error);
      this.showError('Failed to reset student progress: ' + error.message);
    }
  }

  async resetPassword(studentId) {
    const confirmed = await window.modernConfirm?.('Reset password for this student?', {
      title: 'Reset Password',
      type: 'warning',
      confirmText: 'Yes, Reset',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    try {
      // Issue a one-time reset code the professor can share with the student
      const { rawCode, record } = await issueOneTimeResetCode(studentId);
      this.showInfo(`One-time reset code issued for ${studentId}:\n\n${rawCode}\n\nExpires: ${record.expiresAt}\nShare this code with the student to let them set a new password.`, { title: 'Reset Code Issued' });
    } catch (error) {
      this.showError('Failed to reset password: ' + error.message);
    }
  }
}

// Initialize dashboard and expose for inline handlers
const dashboard = new ProfessorDashboard();
window.dashboard = dashboard;

// Mobile menu functionality (kept external)
window.addEventListener('DOMContentLoaded', () => {
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      const isHidden = mobileMenu.style.display === 'none' || !mobileMenu.style.display;
      mobileMenu.style.display = isHidden ? 'block' : 'none';
      mobileMenuBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
      const svg = mobileMenuBtn.querySelector('svg');
      if (svg) {
        if (isHidden) {
          svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';
        } else {
          svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />';
        }
      }
    });

    const mobileLinks = mobileMenu.querySelectorAll('a, button');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.style.display = 'none';
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        const svg = mobileMenuBtn.querySelector('svg');
        if (svg) {
          svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />';
        }
      });
    });
  }

  // Sync mobile menu professor name with desktop
  const syncProfessorName = () => {
    const professorName = document.getElementById('professor-name');
    const mobileProfessorName = document.getElementById('mobile-professor-name');
    if (professorName && mobileProfessorName) {
      mobileProfessorName.textContent = professorName.textContent;
    }
  };
  setInterval(syncProfessorName, 1000);
  syncProfessorName();

  // Mobile logout
  document.getElementById('mobile-logout-btn')?.addEventListener('click', () => {
    dashboard.logoutUser();
  });

  // Initialize Password Reset Admin panel if present
  try { initPasswordResetAdmin(); } catch (e) { console.warn('Password reset admin init failed:', e); }
});

// ================= Password Reset Admin Panel (Professor) =================
async function initPasswordResetAdmin() {
  const container = document.getElementById('resetRequestsPanel');
  if (!container) return; // panel not present in HTML

  const listEl = container.querySelector('[data-reset-requests]');
  const refreshBtn = container.querySelector('[data-refresh-resets]');
  const approveForm = container.querySelector('[data-approve-form]');
  const approveStudentIdInput = container.querySelector('[data-approve-studentId]');
  const approveResultEl = container.querySelector('[data-approve-result]');

  // Ensure Firebase is initialized and user has professor role before proceeding
  const statusMessage = (msg, css = 'text-yellow-400') => {
    if (listEl) listEl.innerHTML = `<li class="${css}">${msg}</li>`;
  };

  // wait for firebase initialize
  async function waitForFirebase(timeoutMs = 5000) {
    const start = Date.now();
    while (!(window.firebase && firebase.apps && firebase.apps.length > 0)) {
      if (Date.now() - start > timeoutMs) break;
      await new Promise(r => setTimeout(r, 150));
    }
    return !!(window.firebase && firebase.apps && firebase.apps.length > 0);
  }

  // wait for auth user
  async function getAuthUser(timeoutMs = 5000) {
    if (!window.firebase || !firebase.auth) return null;
    const existing = firebase.auth().currentUser;
    if (existing) return existing;
    return new Promise(resolve => {
      let done = false;
      const off = firebase.auth().onAuthStateChanged(u => {
        if (!done) { done = true; off(); resolve(u); }
      });
      setTimeout(() => { if (!done) { done = true; try { off(); } catch {} resolve(null); } }, timeoutMs);
    });
  }

  const fbReady = await waitForFirebase();
  if (!fbReady) {
    statusMessage('Firebase is not initialized. Try reloading the page.', 'text-red-500');
    return;
  }

  const user = await getAuthUser();
  if (!user || user.isAnonymous) {
    statusMessage('Sign in as a professor to view and approve reset requests.', 'text-yellow-400');
    // keep form disabled if not signed in
    approveForm?.addEventListener('submit', (e) => { e.preventDefault(); });
    return;
  }

  // verify professor role
  let isProfessor = false;
  try {
    const db = firebase.database();
    const [roleSnap, legacySnap] = await Promise.all([
      db.ref(`roles/professors/${user.uid}`).once('value'),
      db.ref(`professors/${user.uid}`).once('value')
    ]);
    const roleOk = roleSnap.exists() && roleSnap.val() === true;
    const legacyOk = legacySnap.exists() && legacySnap.val() != null;
    isProfessor = !!(roleOk || legacyOk);
  } catch (e) {
    // ignore; treat as not professor
  }
  if (!isProfessor) {
    statusMessage('You do not have permission to manage password reset requests. Ensure your UID is listed under roles/professors.', 'text-red-400');
    approveForm?.addEventListener('submit', (e) => { e.preventDefault(); });
    return;
  }

  const renderList = (requests) => {
    if (!listEl) return;
    listEl.innerHTML = '';
    const entries = Object.entries(requests || {});
    if (!entries.length) {
      listEl.innerHTML = '<li class="text-gray-500">No reset requests</li>';
      return;
    }
    entries.sort((a,b)=> (b[1]?.createdAt||'').localeCompare(a[1]?.createdAt||''));
    for (const [key, req] of entries) {
      const li = document.createElement('li');
      li.className = 'py-2 border-b border-gray-700';
      li.innerHTML = `
        <div class="flex items-center justify-between">
          <div>
            <div class="font-semibold text-sm">${req.studentId || 'unknown'}</div>
            <div class="text-xs text-gray-500">${req.createdAt || ''}</div>
          </div>
          <div>
            <span class="px-2 py-1 text-[10px] rounded ${req.status==='pending'?'bg-yellow-100 text-yellow-800': req.status==='approved'?'bg-blue-100 text-blue-800': req.status==='fulfilled'?'bg-green-100 text-green-800':'bg-gray-100 text-gray-700'}">${req.status||'pending'}</span>
          </div>
        </div>`;
      listEl.appendChild(li);
    }
  };

  async function loadRequests() {
    try {
      const snap = await firebase.database().ref('password_resets/requests').once('value');
      renderList(snap.val() || {});
    } catch (e) {
      console.error('Failed to load reset requests', e);
      if (listEl) listEl.innerHTML = '<li class="text-red-600">Failed to load requests</li>';
    }
  }

  refreshBtn?.addEventListener('click', loadRequests);
  await loadRequests();

  approveForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (approveResultEl) approveResultEl.textContent = '';
    const studentId = approveStudentIdInput?.value?.trim();
    if (!studentId) { if (approveResultEl) approveResultEl.textContent = 'Student ID is required'; return; }
    try {
      const { rawCode, record } = await issueOneTimeResetCode(studentId);
      if (approveResultEl) {
        approveResultEl.innerHTML = `
          <div class="mt-2 p-2 bg-green-50 border border-green-200 rounded">
            <div class="font-semibold">Reset code issued</div>
            <div class="text-sm">Share this code with the student: <span class="font-mono">${rawCode}</span></div>
            <div class="text-xs text-gray-600">Expires: ${record.expiresAt}</div>
          </div>`;
      }
      // mark a pending request as approved if exists
      try {
        const reqSnap = await firebase.database().ref('password_resets/requests').orderByChild('studentId').equalTo(studentId).once('value');
        if (reqSnap.exists()) {
          const reqs = reqSnap.val() || {};
          const key = Object.keys(reqs).find(k => reqs[k]?.status === 'pending');
          if (key) await firebase.database().ref(`password_resets/requests/${key}`).update({ status: 'approved', approvedAt: new Date().toISOString() });
        }
      } catch (_) {}
      await loadRequests();
    } catch (err) {
      if (approveResultEl) approveResultEl.textContent = err?.message || 'Failed to issue code';
    }
  });

  // Load recent history
  const historyList = document.getElementById('reset-history-list');
  async function loadHistory() {
    if (!historyList) return;
    try {
      const snap = await firebase.database().ref('password_resets/history').limitToLast(20).once('value');
      const val = snap.val() || {};
      const entries = Object.entries(val).sort((a,b)=> (b[1]?.issuedAt||'').localeCompare(a[1]?.issuedAt||''));
      historyList.innerHTML = entries.map(([k,v]) => `
        <li class="text-xs text-gray-300 flex justify-between border-b border-gray-700 py-1">
          <span>${v.studentId}</span>
          <span class="text-gray-500">${v.issuedAt} → ${v.expiresAt}</span>
        </li>
      `).join('') || '<li class="text-gray-500">None</li>';
    } catch (e) {
      historyList.innerHTML = '<li class="text-red-600">Failed to load history</li>';
    }
  }
  await loadHistory();
}

async function issueOneTimeResetCode(studentId) {
  if (!window.firebase || !firebase.database) throw new Error('Firebase not initialized');
  // Generate a short human-friendly code, then store a hashed version
  const rawCode = generateReadableCode(8); // e.g., 8 chars
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(rawCode), 'PBKDF2', false, ['deriveBits']);
  const iterations = 100000;
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations }, key, 256);
  const codeHash = bytesToBase64(new Uint8Array(bits));
  const expiresAt = new Date(Date.now() + 1000*60*10).toISOString(); // 10 minutes
  const record = { codeHash, salt: bytesToBase64(saltBytes), iterations, issuedAt: new Date().toISOString(), expiresAt, used: false };
  const db = firebase.database();
  await db.ref(`password_resets/codes/${studentId}`).set(record);
  // Set approved index so student client can read hashed code for verification
  await db.ref(`password_resets/approved/${studentId}`).set(true);
  // Append to history for audit
  const uid = (firebase.auth && firebase.auth().currentUser) ? firebase.auth().currentUser.uid : 'unknown';
  await db.ref('password_resets/history').push({ studentId, issuedBy: uid, issuedAt: record.issuedAt, expiresAt });
  return { rawCode, record };
}

function generateReadableCode(length=8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
  let out = '';
  for (let i=0;i<length;i++) out += alphabet[Math.floor(Math.random()*alphabet.length)];
  return out;
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
