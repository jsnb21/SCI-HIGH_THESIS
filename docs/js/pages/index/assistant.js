// VirtualAssistant class extracted
(function(){
  class VirtualAssistant {
    constructor() {
      this.isOpen = false;
      this.isTyping = false;
      this.isRecording = false;
      this.currentRecognition = null;
      this.apiKey = '';
      // Prefer stable v1 endpoints; fall back to other variants if needed
      this.apiEndpoints = [
        'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent',
        'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-latest:generateContent',
        // Common older or non-alias variants
        'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent',
        'https://generativelanguage.googleapis.com/v1/models/gemini-1.0-pro-latest:generateContent',
        'https://generativelanguage.googleapis.com/v1/models/gemini-1.0-pro:generateContent',
        // Legacy fallback
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
      ];
      this.discoveredModelUrls = null; // populated from /models list lazily
      this.preferredModelUrl = null;   // cache the first working model URL
      this.keyExpiry = null;
      this.maxKeyAge = 30 * 60 * 1000;
      this.configFile = 'config/env-config.json';
      this.conversationHistory = [];
      this.maxHistoryLength = 10;
      this.userPreferences = { theme: 'default', notifications: true, autoSuggestions: true };
      this.smartSuggestions = [
        'How do I create a student account?',
        "What's the difference between Story Mode and Computer Lab?",
        'Can you explain the research methodology?',
        'How does the achievement system work?',
        'What browsers are supported?',
        'Is SCI-HIGH mobile-friendly?'
      ];
      // Local project facts to avoid hallucinations
      this.teamMembers = [
        { name: 'Baronia, James Scott', role: 'Project Lead & Developer' },
        { name: 'Dela Cruz, Richard Joseph', role: 'Documentation & QA Tester' },
        { name: 'Verceles, James Edward', role: 'Lead Developer' }
      ];
      this.teamQueryKeywords = [
        'who are the members', 'members of sci-high', 'team members', 'team of sci-high', 'sci-high team',
        'developers', 'authors', 'contributors', 'thesis team', 'student researchers', 'project members'
      ];
      // Local KB: supported languages/courses
      this.supportedLanguages = [
        { name: 'HTML/CSS/JavaScript', emoji: '🌐', note: 'Front-end web fundamentals used in the Classroom and Web Dev paths' },
        { name: 'Python', emoji: '🐍', note: 'Beginner-friendly with strong problem-solving focus' },
        { name: 'Java', emoji: '☕', note: 'Strongly-typed OOP foundation' },
        { name: 'C++', emoji: '🧩', note: 'Lower-level control and algorithms practice' }
      ];
      this.languageQueryKeywords = [
        'what languages', 'supported languages', 'courses', 'what can i learn', 'programming languages', 'language list'
      ];
      // Local KB: achievements overview (synced with src/services/achievementsUtil.js)
      this.achievementsByTier = {
        Common: ['First Steps', 'Quiz Apprentice', 'Marathon I', 'Scholar', 'Combo Starter'],
        Uncommon: ['Quiz Veteran', 'Marathon II', 'Accuracy Ace', 'Course Finisher'],
        Rare: ['Top Scorer', 'Accuracy Master', 'Combo Master', 'Multi-Talented'],
        Epic: ['Legend', 'Perfectionist', 'Completionist'],
        Mythic: ['Mythic Scholar', 'Accuracy Grandmaster', 'Unbreakable', 'Endurance Master']
      };
      this.achievementQueryKeywords = [
        'achievement', 'achievements', 'badges', 'tiers', 'how do achievements work', 'unlock achievements'
      ];
      // Local KB: modes
      this.modeQueryKeywords = [
        'story mode', 'computer lab', 'difference between story mode and computer lab', 'lab mode', 'classroom mode'
      ];
      // Local KB: leaderboards and contest
      this.contestEndISO = '2025-10-17T00:00:00';
      this.leaderboardQueryKeywords = [
        'leaderboard', 'leaderboards', 'mini-contest', 'contest', 'when does the contest end', 'can i submit score', 'points after contest'
      ];
      // Local KB: AI reranking and privacy
      this.privacyQueryKeywords = [
        'privacy', 'gemini', 'rerank', 'reranking', 'google ai', 'do you send my answers', 'data sent to ai'
      ];
      // Local KB: Adaptive Reranking explainer
      this.rerankingExplainKeywords = [
        'adaptive reranking', 'what is adaptive reranking', 'reranking system', 'bloom-aware reranking', 'reorder questions', 'rank questions'
      ];
      // Local KB: accounts/auth
      this.accountQueryKeywords = [
        'account', 'login', 'guest', 'student', 'general user', 'professor', 'how to sign in'
      ];
      // Local KB: Firebase/runtime
      this.firebaseQueryKeywords = [
        'firebase', 'database', 'realtime database', 'config', 'env config', 'github pages'
      ];
      // Local KB: Browser support and mobile
      this.browserSupportKeywords = [
        'what browsers are supported', 'supported browsers', 'browser support', 'which browser', 'which browsers'
      ];
      this.mobileFriendlyKeywords = [
        'mobile friendly', 'is sci-high mobile friendly', 'mobile support', 'phone support', 'tablet support', 'responsive'
      ];
      this.systemContext = `You are an intelligent assistant for SCI-HIGH...`;
      this.responses = {
        "what is sci-high": { type: 'game', response: 'SCI-HIGH is a revolutionary educational RPG that transforms programming education! 🎮✨ ...' },
        "about game": { type: 'game', response: 'SCI-HIGH features an incredible blend of education and entertainment! 🌟 ...' },
        "thesis research": { type: 'thesis', response: 'The thesis explores how gamification revolutionizes computer science education! 📊 ...' },
        "programming languages": { type: 'technical', response: 'SCI-HIGH supports a comprehensive range of programming languages! 💻 ...' },
        "how to start": { type: 'game', response: "Getting started with SCI-HIGH is super easy! 🚀 ..." },
        "technical details": { type: 'technical', response: 'SCI-HIGH is built with cutting-edge web technologies! 🔧 ...' },
        "help": { type: 'info', response: "I'm your dedicated SCI-HIGH assistant! 🤝 ..." }
      };
      this.init();
    }

    init(){ this.loadApiKeyFromFile(); this.setupSecurityMeasures(); this.bindEvents(); this.setupAutoResponses(); }
    async loadApiKeyFromFile(){
      try {
        try {
          const injected = window?.SCI_HIGH?.GOOGLE_AI_API_KEY || window?.env?.GOOGLE_AI_API_KEY;
          if (injected && this.validateApiKey(injected)) { this.apiKey = injected; this.keyExpiry = Date.now() + this.maxKeyAge; this.updateAIStatus(true); this.primeModels(); return; }
        } catch {}
  const base = (window.__APP_BASE__ || '/');
  const possible = [this.configFile,'./config/env-config.json', base + 'config/env-config.json','config/env-config.json'];
        let ok = false;
        for (const path of possible) {
          try { const response = await fetch(path); if (response.ok) { const cfg = await response.json(); if (cfg.geminiApiKey && cfg.geminiApiKey !== 'YOUR_GEMINI_API_KEY_HERE' && this.validateApiKey(cfg.geminiApiKey)) { this.apiKey = cfg.geminiApiKey; this.keyExpiry = Date.now() + this.maxKeyAge; ok = true; break; } } } catch {}
        }
        if (ok) { this.updateAIStatus(true); this.primeModels(); return; } else { console.warn('⚠️ Could not load API key config file. Manual entry will be required.'); }
      } catch (e) { console.warn('⚠️ Error loading API key from file:', e.message); }
      this.updateAIStatus(false);
    }
    updateAIStatus(hasApiKey){
      const iconWrap = document.getElementById('assistant-toggle');
      if (!iconWrap) return;
      const icon = iconWrap.querySelector('span');
      if (!icon) return;
      // Always show robot only, no star decoration
      icon.textContent = '🤖';
    }
    setupSecurityMeasures(){ window.addEventListener('beforeunload', () => { this.clearApiKey(); }); this.setupKeyExpiration(); document.addEventListener('visibilitychange', () => { if (document.hidden) {} }); }
    setupKeyExpiration(){ setInterval(()=>{ if (this.keyExpiry && Date.now() > this.keyExpiry) { this.clearApiKey(); this.showSecurityNotice('API key expired for security. Please re-enter if needed.'); } }, 60000); }
    clearApiKey(){ this.apiKey=''; this.keyExpiry=null; const input=document.getElementById('api-key-input'); if (input) input.value=''; }
    showSecurityNotice(message){ if (this.isOpen) this.addAssistantMessage(`🔒 Security Notice: ${message}`, 'security'); }
  saveApiKey(){ const input=document.getElementById('api-key-input'); const key=input.value.trim(); if (key){ if(!this.validateApiKey(key)){ this.showStatus('❌ Invalid API key format','error'); return;} this.apiKey=key; this.keyExpiry=Date.now()+this.maxKeyAge; this.preferredModelUrl=null; this.discoveredModelUrls=null; this.saveApiKeyToFile(key); input.value=''; this.updateAIStatus(true); this.primeModels(); this.showStatus(`🔒 API key saved to config file!\nAuto-expires in ${this.maxKeyAge/60000} minutes per session`,'success'); setTimeout(()=>this.hideSettings(),2000);} else { this.showStatus('Please enter a valid API key','error'); } }
    async saveApiKeyToFile(key){ try{ const blob=new Blob([`# Google AI Studio API Key\n# Replace \"your-api-key-here\" with your actual API key from https://makersuite.google.com/app/apikey\n# Keep this file secure and never commit it to version control!\n\n${key}`],{type:'text/plain'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='env-config.json'; a.style.display='none'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); this.showStatus('📁 Config file downloaded! Place it in the config/ folder','info'); } catch(e){ console.warn('Could not create config file download:', e); } }
    validateApiKey(key){ return key.length>20 && /^[A-Za-z0-9_-]+$/.test(key); }
    async testAI(){
      if(!this.apiKey){ this.showStatus('Please enter an API key first','error'); return; }
      if(this.keyExpiry && Date.now()>this.keyExpiry){ this.clearApiKey(); this.showStatus('API key expired. Please enter again.','error'); return; }
      this.showStatus('Testing AI connection... 🔄','info');
      try{
        const aiResponse = await this.callGemini('Say "Hello! AI is working!" in a friendly way with an emoji.');
        if (aiResponse) {
          this.showStatus(`✅ AI Test Successful!\n"${aiResponse}"`,'success');
        } else {
          this.showStatus('❌ AI test failed: No response','error');
        }
      } catch(error){
        this.showStatus(`❌ Connection Error: ${error.message}`,'error');
      }
    }

    async callGemini(prompt){
      const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }]}],
        generationConfig: { temperature: 0.7, maxOutputTokens: 256 }
      };
      let lastErr;

      // Ensure we have discovered models before trying static fallbacks, to avoid 404 spam
      if (!this.discoveredModelUrls && this.apiKey) {
        try { this.discoveredModelUrls = await this.discoverModelUrls(); } catch {}
      }

      // Build candidate URL list with preferred first
      const candidateUrls = [];
      if (this.preferredModelUrl) candidateUrls.push(this.preferredModelUrl);
      if (Array.isArray(this.discoveredModelUrls) && this.discoveredModelUrls.length) {
        candidateUrls.push(...this.rankModelUrls(this.discoveredModelUrls));
      }
      candidateUrls.push(...this.apiEndpoints);

      // Deduplicate
      const seen = new Set();
      const uniqueUrls = candidateUrls.filter(u => (u && !seen.has(u) && seen.add(u)));

      const attempt = async (url) => {
        const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey };
        const body = JSON.stringify(payload);
        const res = await fetch(url, { method: 'POST', headers, body });
        if (res.ok){
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return { ok: true, text };
          return { ok: false, err: new Error('Empty AI response') };
        }
        // Silent skip for expected model/route mismatches
        if (res.status === 404 || res.status === 400) {
          return { ok: false, retry: true };
        }
        const errData = await res.json().catch(()=>({}));
        if (res.status===401 || res.status===403){ this.clearApiKey(); }
        return { ok: false, err: new Error(errData.error?.message || `HTTP ${res.status}`) };
      };

      let tries = 0;
      const maxTries = Math.min(uniqueUrls.length, 6); // limit attempts per call
      for (const url of uniqueUrls){
        if (tries >= maxTries) break;
        tries++;
        try {
          const out = await attempt(url);
          if (out?.ok) {
            this.preferredModelUrl = url; // cache winner for future calls
            return out.text;
          }
          if (out?.retry) continue;
          if (out?.err) lastErr = out.err;
        } catch (e) { lastErr = e; }
      }

      if (lastErr) throw lastErr; else return null;
    }

    async discoverModelUrls(){
      const urls = [];
      const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey };
      // Try v1 models list
      try {
        const res = await fetch('https://generativelanguage.googleapis.com/v1/models', { headers });
        if (res.ok){
          const data = await res.json();
          const names = (data.models || []).map(m => m.name).filter(Boolean); // e.g., 'models/gemini-1.0-pro'
          names.forEach(n => urls.push(`https://generativelanguage.googleapis.com/v1/${n}:generateContent`));
        }
      } catch {}
      // Fallback to v1beta list if needed
      if (urls.length === 0) {
        try {
          const res2 = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers });
          if (res2.ok){
            const data2 = await res2.json();
            const names2 = (data2.models || []).map(m => m.name).filter(Boolean);
            names2.forEach(n => urls.push(`https://generativelanguage.googleapis.com/v1beta/${n}:generateContent`));
          }
        } catch {}
      }
      // Prefer latest aliases first
      urls.sort((a,b)=> a.includes('-latest') ? -1 : b.includes('-latest') ? 1 : 0);
      const unique = [...new Set(urls)];
      return unique;
    }

    async primeModels(){
      try {
        if (!this.apiKey) return;
        const urls = await this.discoverModelUrls();
        if (urls && urls.length) {
          const ranked = this.rankModelUrls(urls);
          this.discoveredModelUrls = ranked;
          // Choose the first preferred as initial cache
          this.preferredModelUrl = ranked[0];
        }
      } catch {}
    }

    rankModelUrls(urls){
      // Score models: prefer v1, prefer gemini-1.5 (flash/pro), then 1.0-pro, de-prioritize 2.5 for stability
      const score = (u) => {
        let s = 0;
        if (u.includes('/v1/')) s += 10; else if (u.includes('/v1beta/')) s += 5;
        if (u.includes('gemini-1.5-')) s += 8;
        if (u.includes('flash')) s += 3;
        if (u.includes('pro')) s += 2;
        if (u.includes('gemini-1.0-pro')) s += 1;
        if (u.includes('gemini-2.5')) s -= 5; // de-prioritize if unstable for this key
        if (u.includes('-latest')) s += 1;
        return -s; // sort ascending -> highest score first by negating
      };
      return [...urls].sort((a,b)=> score(a) - score(b));
    }
    showStatus(message,type){ const statusEl=document.getElementById('api-status'); statusEl.className=`text-xs text-center p-2 rounded-lg ${type==='success'?'bg-accent/20 text-accent': type==='error'?'bg-red-500/20 text-red-400':'bg-purple/20 text-purple'}`; statusEl.textContent=message; statusEl.classList.remove('hidden'); if(type!=='info'){ setTimeout(()=>statusEl.classList.add('hidden'),3000);} }
    bindEvents(){ const toggle=document.getElementById('assistant-toggle'); const close=document.getElementById('assistant-close'); const settings=document.getElementById('assistant-settings'); const settingsClose=document.getElementById('settings-close'); const saveKey=document.getElementById('save-api-key'); const testAI=document.getElementById('test-ai'); const sendBtn=document.getElementById('send-message'); const input=document.getElementById('chat-input'); const voiceBtn=document.getElementById('voice-input'); const quickBtns=document.querySelectorAll('.quick-btn'); const suggestionBtns=document.querySelectorAll('.suggestion-btn'); const exportChat=document.getElementById('export-chat'); const clearChat=document.getElementById('clear-chat');
      toggle.addEventListener('click',()=>this.togglePanel()); close.addEventListener('click',()=>this.closePanel()); settings.addEventListener('click',()=>this.showSettings()); settingsClose.addEventListener('click',()=>this.hideSettings()); saveKey.addEventListener('click',()=>this.saveApiKey()); testAI.addEventListener('click',()=>this.testAI()); sendBtn.addEventListener('click',()=>this.sendMessage()); voiceBtn.addEventListener('click',()=>this.toggleVoiceInput()); exportChat.addEventListener('click',()=>this.exportChatHistory()); clearChat.addEventListener('click',()=>this.clearChatHistory()); input.addEventListener('keydown',(e)=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); this.sendMessage(); } }); input.addEventListener('input',()=>{ this.updateCharCounter(); this.autoResize(); }); input.addEventListener('focus',()=>{ document.getElementById('input-status').classList.remove('hidden'); }); input.addEventListener('blur',()=>{ document.getElementById('input-status').classList.add('hidden'); }); quickBtns.forEach(btn=>{ btn.addEventListener('click',()=>{ const question=btn.getAttribute('data-question'); this.handleQuickQuestion(question); }); }); suggestionBtns.forEach(btn=>{ btn.addEventListener('click',()=>{ const text=btn.getAttribute('data-text'); input.value=text; this.updateCharCounter(); this.autoResize(); input.focus(); }); }); }
    showSettings(){ document.getElementById('settings-panel').classList.remove('hidden'); document.getElementById('chat-messages').style.display='none'; document.getElementById('quick-actions').style.display='none'; }
    hideSettings(){ document.getElementById('settings-panel').classList.add('hidden'); document.getElementById('chat-messages').style.display='block'; document.getElementById('quick-actions').style.display='block'; }
    togglePanel(){ const panel=document.getElementById('assistant-panel'); const toggle=document.getElementById('assistant-toggle'); if(this.isOpen){ this.closePanel(); } else { this.isOpen=true; panel.style.transform='translateX(0)'; panel.style.opacity='1'; toggle.style.transform='scale(0.9)'; setTimeout(()=>{ const messages=document.getElementById('chat-messages'); messages.scrollTop=messages.scrollHeight; },100);} }
    closePanel(){ const panel=document.getElementById('assistant-panel'); const toggle=document.getElementById('assistant-toggle'); this.isOpen=false; panel.style.transform='translateX(100%)'; panel.style.opacity='0'; toggle.style.transform='scale(1)'; }
    sendMessage(){ if(this.isTyping) return; const input=document.getElementById('chat-input'); const message=input.value.trim(); if(message){ this.addToHistory('user', message); this.setButtonLoading(true); this.addUserMessage(message); input.value=''; this.updateCharCounter(); this.autoResize(); this.updateSmartSuggestions(message); setTimeout(()=>{ this.generateResponse(message); },500);} }
    addToHistory(role, content){ this.conversationHistory.push({ role, content, timestamp: new Date().toISOString() }); if (this.conversationHistory.length> this.maxHistoryLength*2) { this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength*2); } }
    updateSmartSuggestions(userMessage){ const keywords=userMessage.toLowerCase().split(' '); if (keywords.includes('start')||keywords.includes('begin')) { this.smartSuggestions.unshift('What are the system requirements?'); } else if (keywords.includes('research')||keywords.includes('thesis')) { this.smartSuggestions.unshift('Can you explain the research findings?'); } else if (keywords.includes('programming')||keywords.includes('code')) { this.smartSuggestions.unshift('Which programming language should I start with?'); } this.smartSuggestions=[...new Set(this.smartSuggestions)].slice(0,8); }
    exportChatHistory(){ if (this.conversationHistory.length===0){ this.showStatus('No chat history to export','info'); return;} const data={ title:'SCI-HIGH AI Assistant Chat History', exportDate:new Date().toISOString(), totalMessages:this.conversationHistory.length, conversation:this.conversationHistory }; const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`sci-high-chat-${new Date().toISOString().split('T')[0]}.json`; a.style.display='none'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); this.showStatus('💾 Chat history exported successfully!','success'); }
    clearChatHistory(){ if(confirm('Are you sure you want to clear all chat history? This action cannot be undone.')){ this.conversationHistory=[]; const messagesContainer=document.getElementById('chat-messages'); const messages=messagesContainer.querySelectorAll('.user-message, .assistant-message:not(:first-child)'); messages.forEach(m=>m.remove()); this.showStatus('🗑️ Chat history cleared successfully!','success'); setTimeout(()=>{ this.addAssistantMessage('Chat cleared! Ready for a fresh conversation. How can I help you today? 🤖✨','info'); },1000);} }
    setButtonLoading(loading){ const sendBtn=document.getElementById('send-message'); const sendText=document.getElementById('send-text'); const sendLoading=document.getElementById('send-loading'); if(loading){ sendBtn.disabled=true; sendText.classList.add('hidden'); sendLoading.classList.remove('hidden'); } else { sendBtn.disabled=false; sendText.classList.remove('hidden'); sendLoading.classList.add('hidden'); } }
    updateCharCounter(){ const input=document.getElementById('chat-input'); const counter=document.getElementById('char-counter'); const length=input.value.length; const maxLength=input.maxLength; counter.textContent=`${length}/${maxLength}`; if(length>maxLength*0.9){ counter.classList.add('text-yellow-400'); counter.classList.remove('text-gray-500'); } else if (length>maxLength*0.8) { counter.classList.add('text-orange-400'); counter.classList.remove('text-gray-500','text-yellow-400'); } else { counter.classList.add('text-gray-500'); counter.classList.remove('text-yellow-400','text-orange-400'); } }
    autoResize(){ const input=document.getElementById('chat-input'); input.style.height='auto'; const maxHeight=80; input.style.height=Math.min(input.scrollHeight, maxHeight)+'px'; }
    toggleVoiceInput(){ if(!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)){ this.addAssistantMessage('Sorry! Voice input is not supported in this browser. Try Chrome or Edge! 🎤❌','info'); return;} if (this.isRecording) this.stopVoiceRecording(); else this.startVoiceRecording(); }
    startVoiceRecording(){ const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition; const recognition=new SpeechRecognition(); recognition.continuous=false; recognition.interimResults=false; recognition.lang='en-US'; const voiceBtn=document.getElementById('voice-input'); this.isRecording=true; voiceBtn.innerHTML='🔴'; voiceBtn.title='Stop Recording'; recognition.onresult=(event)=>{ const transcript=event.results[0][0].transcript; const input=document.getElementById('chat-input'); input.value=transcript; this.updateCharCounter(); this.autoResize(); this.addAssistantMessage(`🎤 Heard: "${transcript}"`, 'info'); }; recognition.onerror=(event)=>{ this.addAssistantMessage(`🎤❌ Voice error: ${event.error}`,'info'); this.stopVoiceRecording(); }; recognition.onend=()=>{ this.stopVoiceRecording(); }; recognition.start(); this.currentRecognition=recognition; this.addAssistantMessage('🎤 Listening... Speak your question!','info'); }
    stopVoiceRecording(){ if (this.currentRecognition) this.currentRecognition.stop(); const voiceBtn=document.getElementById('voice-input'); this.isRecording=false; voiceBtn.innerHTML='🎤'; voiceBtn.title='Voice Input'; }
    handleQuickQuestion(q){ if (this.isTyping) return; this.addUserMessage(q); setTimeout(()=>{ this.generateResponse(q); }, 500); }
    addUserMessage(message){ const messagesContainer=document.getElementById('chat-messages'); const div=document.createElement('div'); div.className='user-message mb-3 text-right animate-bounce-in'; div.innerHTML = `<div class="bg-gradient-to-r from-primary/20 to-yellow-300/20 rounded-lg p-2 max-w-xs ml-auto md:p-3 border border-primary/30"><div class="text-xs md:text-sm text-white">${this.formatMessage(message)}</div></div>`; messagesContainer.appendChild(div); messagesContainer.scrollTop=messagesContainer.scrollHeight; }
    addAssistantMessage(message, type='info'){ const messagesContainer=document.getElementById('chat-messages'); const div=document.createElement('div'); div.className='assistant-message mb-3 animate-bounce-in'; const bgColor = type==='game' ? 'bg-gradient-to-r from-accent/20 to-green-500/20' : type==='thesis' ? 'bg-gradient-to-r from-purple/20 to-indigo-500/20' : type==='technical' ? 'bg-gradient-to-r from-cyan/20 to-blue-500/20' : type==='ai' ? 'bg-gradient-to-r from-purple/20 to-cyan/20' : type==='security' ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20' : 'bg-gradient-to-r from-purple/20 to-cyan/20'; const borderColor = type==='game' ? 'border-accent/30' : type==='thesis' ? 'border-purple/30' : type==='technical' ? 'border-cyan/30' : type==='ai' ? 'border-purple/30' : type==='security' ? 'border-red-500/30' : 'border-purple/30'; const textColor = type==='security' ? 'text-red-300' : 'text-white'; const typeIcon = type==='game' ? '🎮' : type==='thesis' ? '📚' : type==='technical' ? '⚙️' : type==='ai' ? '🤖' : type==='security' ? '🔒' : '🤖'; div.innerHTML = `<div class="${bgColor} rounded-lg p-2 max-w-xs md:p-3 border ${borderColor}"><div class="flex items-start space-x-2"><div class="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-dark font-bold text-xs flex-shrink-0">${typeIcon}</div><div class="flex-1 ${textColor}">${this.formatMessage(message)}</div></div></div>`; messagesContainer.appendChild(div); messagesContainer.scrollTop=messagesContainer.scrollHeight; }
    formatMessage(message){ return message.replace(/\*\*(.*?)\*\*/g,'<strong class="text-primary">$1</strong>').replace(/\*(.*?)\*/g,'<em class="text-accent">$1</em>').replace(/`(.*?)`/g,'<code class="bg-dark/50 px-1 py-0.5 rounded text-cyan text-xs">$1</code>').replace(/\n•/g,'\n<span class="text-primary">•</span>').replace(/(\d+\.)/g,'<span class="text-primary font-bold">$1</span>').replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" class="text-cyan hover:text-primary underline">$1</a>').replace(/#{1,6}\s?(.*)/g,'<strong class="text-primary text-sm">$1</strong>'); }
    generateResponse(userMessage){
      const message = userMessage.toLowerCase();
      this.showTypingIndicator();
      // 1) Try local deterministic answers first
      const local = this.getLocalAnswer(message);
      if (local) {
        const typingDelay = Math.min(Math.max(local.text.length * 10, 300), 1200);
        setTimeout(()=>{ this.hideTypingIndicator(); this.addToHistory('assistant', local.text); this.addAssistantMessage(local.text, local.type || 'info'); }, typingDelay);
        return;
      }
      // 2) Otherwise defer to AI if key exists; else use built-in fallback
      if (this.apiKey && this.apiKey.length>0) { this.generateAIResponse(userMessage); } else { this.generateFallbackResponse(message); }
    }

    getLocalAnswer(message){
      try {
        // Team/members queries
        if (this.teamQueryKeywords.some(k => message.includes(k))) {
          const text = this.formatTeamMembersAnswer();
          return { text, type: 'info' };
        }
        // Supported languages/courses
        if (this.languageQueryKeywords.some(k => message.includes(k))) {
          const text = this.formatSupportedLanguagesAnswer();
          return { text, type: 'game' };
        }
        // Achievements overview
        if (this.achievementQueryKeywords.some(k => message.includes(k))) {
          const text = this.formatAchievementsOverview();
          return { text, type: 'game' };
        }
        // Modes: Story vs Computer Lab
        if (this.modeQueryKeywords.some(k => message.includes(k))) {
          const text = this.formatModesAnswer();
          return { text, type: 'game' };
        }
        // Leaderboards and contest rules
        if (this.leaderboardQueryKeywords.some(k => message.includes(k))) {
          const text = this.formatLeaderboardRulesAnswer();
          return { text, type: 'game' };
        }
        // AI reranking and privacy
        if (this.privacyQueryKeywords.some(k => message.includes(k))) {
          const text = this.formatPrivacyAnswer();
          return { text, type: 'technical' };
        }
        // Adaptive Reranking explainer
        if (this.rerankingExplainKeywords.some(k => message.includes(k))) {
          const text = this.formatAdaptiveRerankingAnswer();
          return { text, type: 'technical' };
        }
        // Accounts/auth
        if (this.accountQueryKeywords.some(k => message.includes(k))) {
          const text = this.formatAccountsAnswer();
          return { text, type: 'info' };
        }
        // Firebase/runtime config
        if (this.firebaseQueryKeywords.some(k => message.includes(k))) {
          const text = this.formatFirebaseAnswer();
          return { text, type: 'technical' };
        }
        // Browser support
        if (this.browserSupportKeywords.some(k => message.includes(k))) {
          const text = this.formatBrowserSupportAnswer();
          return { text, type: 'technical' };
        }
        // Mobile-friendly
        if (this.mobileFriendlyKeywords.some(k => message.includes(k))) {
          const text = this.formatMobileFriendlyAnswer();
          return { text, type: 'technical' };
        }
        return null;
      } catch { return null; }
    }

    formatTeamMembersAnswer(){
      const lines = this.teamMembers.map(m => `• ${m.name}\n  ${m.role}`);
      return `Here are the SCI-HIGH team members:\n\n${lines.join('\n\n')}`;
    }
    formatSupportedLanguagesAnswer(){
      const lines = this.supportedLanguages.map(l => `${l.emoji} ${l.name} — ${l.note}`);
      return `You can learn and practice the following in SCI-HIGH:\n\n${lines.join('\n')}\n\nTip: The Classroom and Web Dev paths emphasize HTML/CSS/JS, while the Computer Lab features fast-paced quizzes across all topics.`;
    }
    formatAchievementsOverview(){
      const tierLines = Object.entries(this.achievementsByTier).map(([tier, names]) => `• ${tier}: ${names.join(', ')}`);
      return `Achievements system overview:\n\n${tierLines.join('\n')}\n\nUnlocking basics:\n- Sessions completed and total points contribute to Common/Uncommon tiers.\n- Accuracy and streaks unlock Rare/Epic.\n- Mythic requires long-term mastery (e.g., 5M points, 95%+ accuracy, 75+ streak, 500 sessions).`;
    }
    formatModesAnswer(){
      return `Modes in SCI-HIGH:\n\n• Story (Classroom): Narrative-driven learning with lessons and quizzes that progress your mastery.\n• Computer Lab: Quick, competitive sessions geared for practice and leaderboards.\n\nUse Story to learn concepts step-by-step, then jump into the Lab to test speed and retention.`;
    }
    formatLeaderboardRulesAnswer(){
      const end = new Date(this.contestEndISO);
      const local = new Date(end.getFullYear(), end.getMonth(), end.getDate(), end.getHours(), end.getMinutes(), end.getSeconds());
      const when = `${local.toLocaleString()}`;
      return `Leaderboards and MINI-CONTEST:\n\n• Real-time leaderboards are powered by Firebase.\n• The MINI-CONTEST accepts score submissions until: ${when} (local time).\n• After the deadline, new writes are blocked—existing rankings remain visible.\n• You’ll see a toast/alert when the contest ends.`;
    }
    formatPrivacyAnswer(){
      return `AI reranking privacy:\n\n• We never send question text or your answers to AI.\n• Only anonymized metadata (IDs, Bloom level, difficulty, tags) is used to re-order a small candidate set.\n• Strict guardrails: JSON-only output, low temperature/tokens, timeouts, caching, cooldowns, and local fallbacks.`;
    }
    formatAccountsAnswer(){
      return `Account types:\n\n• Guest: Instant play, no signup; some features limited.\n• Student: Anonymous sign-in via Firebase for gameplay; progress tracked.\n• General User: Personal account (email/password).\n• Professor: Email/password; access to professor dashboard if provisioned.\n\nNote: Authentication uses Firebase (compat SDK).`;
    }
    formatFirebaseAnswer(){
      return `Platform and config:\n\n• Storage: Firebase Realtime Database (compat SDK).\n• Hosting: GitHub Pages with Vite’s base path configured.\n• Runtime config: env-config.json and firebase-init.js are optionally injected (via CI secrets).\n• The app guard-loads these files so missing configs don’t break the site.`;
    }
    formatAdaptiveRerankingAnswer(){
      return `Adaptive Reranking (Bloom‑aware):\n\n• Purpose: Reorders a small set of upcoming questions to better match your current mastery and goals.\n• Signals used: Bloom level tags (remembering → creating), difficulty band, lightweight tags, and recent history.\n• Privacy: Only anonymized metadata (IDs, Bloom, difficulty, tags) is sent—no question text or your answers.\n• Guardrails: JSON‑only responses, low temperature/tokens, short timeouts, caching/cooldowns, and safe local fallbacks when AI isn’t available.`;
    }
    formatBrowserSupportAnswer(){
      return `Browser support:\n\n• Best: Chrome and Microsoft Edge (recommended for voice input and WebGL performance).\n• Also works: Firefox (voice dictation is limited) and Safari (performance varies on iOS).\n• Requirements: Modern browser with ES modules, WebGL, and audio enabled.\n• Tip: Keep your browser up to date for the smoothest gameplay.`;
    }
    formatMobileFriendlyAnswer(){
      return `Mobile friendliness:\n\n• The site and UI are responsive, and the game runs on many phones/tablets.\n• Best experience is still desktop or laptop (more GPU/CPU headroom).\n• On mobile, use landscape orientation and a modern Chromium browser (Chrome/Edge).\n• iOS notes: Safari may limit audio/voice input and can throttle WebGL in heavy scenes.`;
    }
    async generateAIResponse(userMessage){
      if (this.keyExpiry && Date.now() > this.keyExpiry) {
        this.clearApiKey();
        this.hideTypingIndicator();
        this.addAssistantMessage('🔒 API key expired for security. Using fallback responses.','security');
        this.generateFallbackResponse(userMessage.toLowerCase());
        return;
      }
      try {
        const conversationContext = this.conversationHistory
          .map(m=>`${m.role}: ${m.content}`)
          .slice(-this.maxHistoryLength)
          .join('\n');
        const enhancedPrompt = `${this.systemContext}\n\nPrevious conversation context:\n${conversationContext}\n\nCurrent user question: ${userMessage}\n\nPlease provide a helpful, engaging response about SCI-HIGH or the thesis research. Consider the conversation context to provide more personalized and relevant answers. Keep responses concise (under 250 words) and include relevant emojis. Match the gaming/educational theme and maintain conversation flow.`;

        const aiResponse = await this.callGemini(enhancedPrompt);
        if (aiResponse){
          this.hideTypingIndicator();
          this.addToHistory('assistant', aiResponse);
          this.addAssistantMessage(aiResponse,'ai');
          this.addFollowUpSuggestions(aiResponse);
          return;
        }
      } catch (error) {
        console.warn('AI API failed, using fallback:', error);
        this.addAssistantMessage(`🤖 AI notice: ${error.message}. Using built-in responses for now.`, 'security');
      }
      this.generateFallbackResponse(userMessage.toLowerCase());
    }
    addFollowUpSuggestions(aiResponse){ const response=aiResponse.toLowerCase(); if (response.includes('story mode') || response.includes('character')) { this.updateSuggestionButtons(['Tell me more about Noah\'s Web Dev path','What challenges does Lily face in Python?','How does Damian\'s Java story unfold?']); } else if (response.includes('research') || response.includes('thesis')) { this.updateSuggestionButtons(['What methods were used to measure engagement?','Can you summarize the key results?','What\'s the sample size and demographics?']); } else if (response.includes('technical') || response.includes('programming')) { this.updateSuggestionButtons(['How is Phaser.js used in the game?','How does Firebase power real-time features?','What about mobile performance optimization?']); } }
    updateSuggestionButtons(newSuggestions){ const container=document.getElementById('input-suggestions'); if (!container) return; newSuggestions.forEach((suggestion, index)=>{ setTimeout(()=>{ const btn=document.createElement('button'); btn.className='suggestion-btn text-xs bg-dark/40 hover:bg-dark/60 text-gray-300 rounded px-2 py-1'; btn.setAttribute('data-text', suggestion); btn.textContent=suggestion; container.appendChild(btn); setTimeout(()=>{ if (btn && btn.parentElement) btn.remove(); }, 30000); }, index*200); }); }
    generateFallbackResponse(message){ let response=null; let responseType='info'; const patterns=[ { keywords:['what is sci-high','sci-high','what is the game'], response:this.responses['what is sci-high'] }, { keywords:['about game','about','features','info'], response:this.responses['about game'] }, { keywords:['thesis','research','study'], response:this.responses['thesis research'] }, { keywords:['language','languages','programming'], response:this.responses['programming languages'] }, { keywords:['start','begin','getting started'], response:this.responses['how to start'] }, { keywords:['technical','tech details','stack'], response:this.responses['technical details'] }, { keywords:['help','support','assist'], response:this.responses['help'] } ]; for (const pattern of patterns){ if (pattern.keywords.some(k=>message.includes(k))){ response = pattern.response.response; responseType = pattern.response.type; break; } }
      if (!response && this.conversationHistory.length>0){ const recentTopics=this.conversationHistory.map(m=>m.content.toLowerCase()).join(' '); if (recentTopics.includes('game') && message.includes('more')) { response = this.responses['about game'].response; responseType='game'; } else if (recentTopics.includes('research') && (message.includes('more') || message.includes('detail'))) { response = this.responses['thesis research'].response; responseType='thesis'; } }
      if (!response){ if (message.includes('thank')||message.includes('thanks')) { response = "You're absolutely welcome! 😊 I'm thrilled to help you explore SCI-HIGH! Whether you're curious about the game mechanics, research findings, or technical implementation, I'm here to guide your learning adventure. Feel free to ask anything else! 🚀✨"; } else if (message.includes('hi')||message.includes('hello')||message.includes('hey')) { response = "Hello there, future coding champion! 👋✨ Welcome to the world of SCI-HIGH! I'm your dedicated AI assistant, ready to help you navigate this exciting educational gaming adventure. What brings you here today? Are you interested in:\n• 🎮 Learning about the game\n• 📚 Understanding the research\n• 💻 Exploring programming concepts\n• 🚀 Getting started with your coding journey"; } else if (message.includes('bye')||message.includes('goodbye')) { response = 'Farewell, brave adventurer! 👋 May your coding journey be filled with epic discoveries and bug-free adventures! Remember, every expert was once a beginner. Keep learning, keep coding, and keep being awesome! See you next time in the SCI-HIGH universe! 🚀✨'; } else { response = "I'm here to help! Ask me about the game, thesis research, or technical implementation. 😊"; } }
      if (responseType==='game'){ response += "\n\n💡 **Want to explore more?** Try asking about specific characters, programming challenges, or technical features!"; }
      else if (responseType==='thesis'){ response += "\n\n📊 **Curious about methodology?** Ask about data collection methods, sample demographics, or statistical analysis!"; }
      const typingDelay = Math.min(Math.max(response.length * 20, 800), 2500);
      setTimeout(()=>{ this.hideTypingIndicator(); this.addAssistantMessage(response, responseType); }, typingDelay);
    }
    showTypingIndicator(){ this.isTyping=true; const messagesContainer=document.getElementById('chat-messages'); const typingDiv=document.createElement('div'); typingDiv.className='typing-indicator mb-3'; typingDiv.id='typing-indicator'; typingDiv.innerHTML=''; messagesContainer.appendChild(typingDiv); messagesContainer.scrollTop=messagesContainer.scrollHeight; }
    hideTypingIndicator(){ this.isTyping=false; this.setButtonLoading(false); const ti=document.getElementById('typing-indicator'); if (ti) ti.remove(); }
    setupAutoResponses(){ setInterval(()=>{}, 30000); }
  }
  document.addEventListener('DOMContentLoaded', () => {
    new VirtualAssistant();
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener('click', () => {
        const isHidden = mobileMenu.style.display === 'none' || mobileMenu.style.display === '';
        mobileMenu.style.display = isHidden ? 'block' : 'none';
      });
    }
    const syncMobileMenu = () => {
      try {
        const profLinkDesktop = document.getElementById('professor-nav-link');
        const profLinkMobile = document.getElementById('mobile-professor-nav-link');
        const userGreeting = document.getElementById('user-greeting');
        const mobileGreeting = document.getElementById('mobile-user-greeting');
        const loginBtn = document.getElementById('login-btn');
        const mobileLoginBtn = document.getElementById('mobile-login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
        if (profLinkDesktop && profLinkMobile) {
          if (!profLinkDesktop.classList.contains('hidden')) profLinkMobile.classList.remove('hidden');
          else profLinkMobile.classList.add('hidden');
        }
        if (userGreeting && mobileGreeting) {
          if (!userGreeting.classList.contains('hidden')) mobileGreeting.classList.remove('hidden');
          else mobileGreeting.classList.add('hidden');
        }
        if (loginBtn && mobileLoginBtn) {
          if (loginBtn.classList.contains('hidden')) mobileLoginBtn.style.display = 'none';
          else mobileLoginBtn.style.display = 'block';
        }
        if (logoutBtn && mobileLogoutBtn) {
          if (logoutBtn.classList.contains('hidden')) mobileLogoutBtn.classList.add('hidden');
          else mobileLogoutBtn.classList.remove('hidden');
        }
      } catch {}
    };
    setInterval(syncMobileMenu, 1000);
    syncMobileMenu();
  });
})();
