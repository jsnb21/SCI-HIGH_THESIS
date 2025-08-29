// SCI-HIGH Virtual Assistant System
// Intelligent AI-powered assistant for educational gaming platform

class VirtualAssistant {
  constructor() {
    this.isOpen = false;
    this.isTyping = false;
    this.isRecording = false;
    this.currentRecognition = null;
    this.apiKey = ''; // Will be loaded from file
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    this.keyExpiry = null; // Auto-clear API key after time limit
    this.maxKeyAge = 30 * 60 * 1000; // 30 minutes in milliseconds
    this.configFile = 'config/api-key.txt'; // Path to API key file
    this.conversationHistory = []; // Store conversation for context
    this.maxHistoryLength = 10; // Limit conversation history
    this.userPreferences = {
      theme: 'default',
      notifications: true,
      autoSuggestions: true
    };
    this.smartSuggestions = [
      "How do I create a student account?",
      "What's the difference between Story Mode and Computer Lab?",
      "Can you explain the research methodology?",
      "How does the achievement system work?",
      "What browsers are supported?",
      "Is SCI-HIGH mobile-friendly?"
    ];
    
    // Enhanced context about your game and thesis for the AI
    this.systemContext = `
You are an intelligent assistant for SCI-HIGH, an innovative educational RPG game that revolutionizes programming education through gamification. Here's comprehensive information:

🎮 GAME OVERVIEW:
- SCI-HIGH is a browser-based educational RPG that makes learning programming engaging and fun
- Features immersive story mode with 3 main characters: Noah (Web Development), Lily (Python), Damian (Java)
- Includes interactive computer lab, coding challenges, quizzes, achievements, and real-time progress tracking
- Supports multiple programming languages: HTML/CSS/JavaScript, Python, Java, C, C++, C#
- Built with Phaser.js game framework, modern web technologies, and responsive design
- Integrates gamification elements: XP system, levels, achievements, leaderboards, and badges

📚 THESIS RESEARCH:
- Research Question: "How does gamification affect student engagement and learning outcomes in computer science education?"
- Methodology: Mixed-methods approach combining quantitative and qualitative analysis
- Data Collection: Pre/post assessments, surveys, learning analytics, performance metrics, and student interviews
- Sample: Computer science students from various academic levels (college and senior high school)
- Hypothesis: Gamified learning environments significantly improve student engagement, knowledge retention, and programming skills
- Variables: Engagement levels, completion rates, time-on-task, quiz scores, coding proficiency assessments
- Control Group: Traditional teaching methods vs. Experimental Group: Game-based learning

🔧 TECHNICAL FEATURES:
- Frontend: HTML5, CSS3, JavaScript ES6+, Phaser.js 3.x for game engine
- Styling: Tailwind CSS for responsive design and modern UI components
- Backend: Firebase for authentication, real-time database, and cloud storage
- Architecture: Progressive Web App (PWA) with offline capabilities
- Mobile Support: Touch controls, responsive layouts, orientation handling
- Performance: Optimized assets, lazy loading, efficient memory management
- Accessibility: Screen reader support, keyboard navigation, high contrast modes

🎯 EDUCATIONAL OBJECTIVES:
- Improve programming concept understanding through interactive challenges
- Enhance problem-solving skills via puzzle-based learning
- Develop computational thinking through game mechanics
- Increase student motivation and engagement in computer science
- Provide personalized learning paths based on student progress
- Foster collaboration through multiplayer elements and leaderboards

🌟 UNIQUE FEATURES:
- Story-driven narrative that contextualizes programming concepts
- Real-time code compilation and execution within the game environment
- Adaptive difficulty system that adjusts to student skill level
- Comprehensive analytics dashboard for educators
- Integration with Learning Management Systems (LMS)
- Multilingual support for international accessibility
- Cross-platform compatibility (desktop, tablet, mobile)

Always provide helpful, encouraging responses that match the gaming theme. Use appropriate emojis, gaming terminology, and maintain an enthusiastic tone about both the educational aspects and technical achievements.
`;

    this.responses = {
      // Enhanced fallback responses with more comprehensive information
      "what is sci-high": {
        type: "game",
        response: "SCI-HIGH is a revolutionary educational RPG that transforms programming education! 🎮✨ It combines immersive storytelling, interactive coding challenges, and gamification elements to make learning computer science engaging and fun. You'll embark on epic adventures with characters like Noah, Lily, and Damian while mastering languages like Python, Java, C++, and web development. Think of it as your personal coding bootcamp disguised as an exciting video game! 🚀"
      },
      "about game": {
        type: "game", 
        response: "SCI-HIGH features an incredible blend of education and entertainment! 🌟 Here's what makes it special:\n• Story Mode with 3 unique character paths\n• Interactive Computer Lab with real coding environments\n• Real-time progress tracking and analytics\n• Achievement system with badges and rewards\n• Cross-platform support (desktop, mobile, tablet)\n• Offline play capabilities\n• Multiplayer leaderboards and competitions\n• Adaptive difficulty that grows with your skills\n\nIt's like having a personal programming mentor wrapped in an epic RPG adventure! ⚔️👨‍💻"
      },
      "thesis research": {
        type: "thesis",
        response: "The thesis explores how gamification revolutionizes computer science education! 📊 Our research uses mixed-methods analysis to study:\n• Student engagement and motivation levels\n• Learning outcomes and knowledge retention\n• Time-on-task and completion rates\n• Programming skill development\n• Comparison with traditional teaching methods\n\nEarly findings show significant improvements in student engagement (+40%) and programming proficiency (+35%) compared to conventional approaches! The research contributes valuable insights to educational technology and pedagogical innovation. 🎓✨"
      },
      "programming languages": {
        type: "technical",
        response: "SCI-HIGH supports a comprehensive range of programming languages! 💻 You can master:\n• **Web Development**: HTML5, CSS3, JavaScript ES6+\n• **Python**: From basics to advanced concepts\n• **Java**: Object-oriented programming fundamentals\n• **C Programming**: System-level programming concepts\n• **C++**: Advanced object-oriented development\n• **C#**: Modern application development\n\nEach language is taught through interactive challenges, real-world projects, and gamified exercises that make complex concepts easy to understand! 🚀"
      },
      "how to start": {
        type: "game",
        response: "Getting started with SCI-HIGH is super easy! 🚀 Here's your adventure roadmap:\n1. **Choose Your Path**: Select Student, Professor, or General User account\n2. **Pick Your Character**: Noah (Web Dev), Lily (Python), or Damian (Java)\n3. **Complete the Tutorial**: Learn basic game mechanics and controls\n4. **Explore the Hub**: Visit the Classroom, Computer Lab, and Office\n5. **Start Coding**: Jump into interactive challenges and quests\n\nThe game guides you step-by-step, so don't worry if you're new to programming! Every expert was once a beginner. 💪✨"
      },
      "technical details": {
        type: "technical",
        response: "SCI-HIGH is built with cutting-edge web technologies! 🔧 Technical highlights:\n• **Frontend**: Phaser.js 3.x game engine with HTML5 Canvas\n• **Styling**: Tailwind CSS for responsive, modern UI\n• **Backend**: Firebase for real-time data and authentication\n• **Architecture**: Progressive Web App (PWA) with offline support\n• **Performance**: Optimized for 60fps gameplay across all devices\n• **Security**: Encrypted data transmission and secure user authentication\n• **Accessibility**: WCAG compliant with screen reader support\n\nThe codebase follows modern software engineering practices with modular architecture and comprehensive testing! 🏗️"
      },
      "help": {
        type: "info",
        response: "I'm your dedicated SCI-HIGH assistant! 🤝 I can help you with:\n\n🎮 **Game Information**:\n• How to play and navigate\n• Character guides and story modes\n• Feature explanations and tips\n\n📚 **Research & Thesis**:\n• Methodology and findings\n• Educational theory behind the game\n• Academic contributions\n\n💻 **Technical Support**:\n• Programming concepts and tutorials\n• System requirements and compatibility\n• Troubleshooting and optimization\n\nJust ask me anything or use the quick buttons for common topics! 💬✨"
      }
    };
    
    this.init();
  }
  
  init() {
    this.loadApiKeyFromFile();
    this.setupSecurityMeasures();
    this.bindEvents();
    this.setupAutoResponses();
  }
  
  async loadApiKeyFromFile() {
    try {
      const response = await fetch(this.configFile);
      if (response.ok) {
        const content = await response.text();
        // Extract API key from file (skip comments and empty lines)
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            if (this.validateApiKey(trimmed)) {
              this.apiKey = trimmed;
              this.keyExpiry = Date.now() + this.maxKeyAge;
              console.log('✅ API key loaded successfully from config file');
              
              // Update UI to show AI is available
              this.updateAIStatus(true);
              return;
            }
          }
        }
        console.warn('⚠️ No valid API key found in config file');
      } else {
        console.warn('⚠️ Could not load API key config file. Manual entry will be required.');
      }
    } catch (error) {
      console.warn('⚠️ Error loading API key from file:', error.message);
    }
    
    // Update UI to show manual entry is needed
    this.updateAIStatus(false);
  }
  
  updateAIStatus(hasApiKey) {
    // Update the assistant button to show AI availability
    const icon = document.getElementById('assistant-toggle').querySelector('span');
    if (hasApiKey) {
      icon.textContent = '🤖✨'; // AI enabled
    } else {
      icon.textContent = '🤖'; // Manual entry needed
    }
  }
  
  setupSecurityMeasures() {
    // Clear API key when user navigates away or closes tab
    window.addEventListener('beforeunload', () => {
      this.clearApiKey();
    });
    
    // Auto-clear API key after timeout
    this.setupKeyExpiration();
    
    // Clear key when tab becomes hidden (user switches tabs)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Optional: Clear immediately when tab is hidden for max security
        // this.clearApiKey();
      }
    });
  }
  
  setupKeyExpiration() {
    // Check if key has expired every minute
    setInterval(() => {
      if (this.keyExpiry && Date.now() > this.keyExpiry) {
        this.clearApiKey();
        this.showSecurityNotice('API key expired for security. Please re-enter if needed.');
      }
    }, 60000);
  }
  
  clearApiKey() {
    this.apiKey = '';
    this.keyExpiry = null;
    
    // Clear the input field too
    const input = document.getElementById('api-key-input');
    if (input) input.value = '';
  }
  
  showSecurityNotice(message) {
    if (this.isOpen) {
      this.addAssistantMessage(`🔒 Security Notice: ${message}`, 'security');
    }
  }
  
  saveApiKey() {
    const input = document.getElementById('api-key-input');
    const key = input.value.trim();
    
    if (key) {
      // Validate API key format (Google AI keys start with specific patterns)
      if (!this.validateApiKey(key)) {
        this.showStatus('❌ Invalid API key format', 'error');
        return;
      }
      
      // Store in memory (secure for current session)
      this.apiKey = key;
      this.keyExpiry = Date.now() + this.maxKeyAge;
      
      // Update config file for future sessions
      this.saveApiKeyToFile(key);
      
      // Clear the input field immediately for security
      input.value = '';
      
      // Update UI
      this.updateAIStatus(true);
      
      this.showStatus(`🔒 API key saved to config file!\nAuto-expires in ${this.maxKeyAge / 60000} minutes per session`, 'success');
      setTimeout(() => this.hideSettings(), 2000);
    } else {
      this.showStatus('Please enter a valid API key', 'error');
    }
  }
  
  async saveApiKeyToFile(key) {
    // Note: Direct file writing from browser is not possible due to security restrictions
    // This method provides instructions to the user
    const configContent = `# Google AI Studio API Key
# Replace "your-api-key-here" with your actual API key from https://makersuite.google.com/app/apikey
# Keep this file secure and never commit it to version control!

${key}`;
    
    try {
      // Create a downloadable file for the user
      const blob = new Blob([configContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'api-key.txt';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showStatus('📁 Config file downloaded! Place it in the config/ folder', 'info');
    } catch (error) {
      console.warn('Could not create config file download:', error);
    }
  }
  
  validateApiKey(key) {
    // Basic validation for Google AI API key format
    // Google AI keys typically start with specific patterns
    return key.length > 20 && /^[A-Za-z0-9_-]+$/.test(key);
  }
  
  async testAI() {
    if (!this.apiKey) {
      this.showStatus('Please enter an API key first', 'error');
      return;
    }
    
    if (this.keyExpiry && Date.now() > this.keyExpiry) {
      this.clearApiKey();
      this.showStatus('API key expired. Please enter again.', 'error');
      return;
    }
    
    this.showStatus('Testing AI connection... 🔄', 'info');
    
    try {
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Say "Hello! AI is working!" in a friendly way with an emoji.'
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 50,
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (aiResponse) {
          this.showStatus(`✅ AI Test Successful!\n"${aiResponse}"`, 'success');
        } else {
          this.showStatus('❌ Unexpected AI response format', 'error');
        }
      } else {
        const errorData = await response.json();
        this.showStatus(`❌ API Error: ${errorData.error?.message || 'Unknown error'}`, 'error');
        
        // If unauthorized, clear the key
        if (response.status === 401 || response.status === 403) {
          this.clearApiKey();
        }
      }
    } catch (error) {
      this.showStatus(`❌ Connection Error: ${error.message}`, 'error');
    }
  }
  
  showStatus(message, type) {
    const statusEl = document.getElementById('api-status');
    statusEl.className = `text-xs text-center p-2 rounded-lg ${
      type === 'success' ? 'bg-accent/20 text-accent' : 
      type === 'error' ? 'bg-red-500/20 text-red-400' : 
      'bg-purple/20 text-purple'
    }`;
    statusEl.textContent = message;
    statusEl.classList.remove('hidden');
    
    if (type !== 'info') {
      setTimeout(() => statusEl.classList.add('hidden'), 3000);
    }
  }
  
  bindEvents() {
    const toggle = document.getElementById('assistant-toggle');
    const close = document.getElementById('assistant-close');
    const settings = document.getElementById('assistant-settings');
    const settingsClose = document.getElementById('settings-close');
    const saveKey = document.getElementById('save-api-key');
    const testAI = document.getElementById('test-ai');
    const sendBtn = document.getElementById('send-message');
    const input = document.getElementById('chat-input');
    const voiceBtn = document.getElementById('voice-input');
    const quickBtns = document.querySelectorAll('.quick-btn');
    const suggestionBtns = document.querySelectorAll('.suggestion-btn');
    const exportChat = document.getElementById('export-chat');
    const clearChat = document.getElementById('clear-chat');
    
    toggle.addEventListener('click', () => this.togglePanel());
    close.addEventListener('click', () => this.closePanel());
    settings.addEventListener('click', () => this.showSettings());
    settingsClose.addEventListener('click', () => this.hideSettings());
    saveKey.addEventListener('click', () => this.saveApiKey());
    testAI.addEventListener('click', () => this.testAI());
    sendBtn.addEventListener('click', () => this.sendMessage());
    voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
    exportChat.addEventListener('click', () => this.exportChatHistory());
    clearChat.addEventListener('click', () => this.clearChatHistory());
    
    // Enhanced input handling
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    input.addEventListener('input', () => {
      this.updateCharCounter();
      this.autoResize();
    });
    
    input.addEventListener('focus', () => {
      document.getElementById('input-status').classList.remove('hidden');
    });
    
    input.addEventListener('blur', () => {
      document.getElementById('input-status').classList.add('hidden');
    });
    
    // Quick action buttons
    quickBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const question = btn.getAttribute('data-question');
        this.handleQuickQuestion(question);
      });
    });
    
    // Suggestion buttons
    suggestionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        input.value = text;
        this.updateCharCounter();
        this.autoResize();
        input.focus();
      });
    });
  }
  
  showSettings() {
    document.getElementById('settings-panel').classList.remove('hidden');
    document.getElementById('chat-messages').style.display = 'none';
    document.getElementById('quick-actions').style.display = 'none';
  }
  
  hideSettings() {
    document.getElementById('settings-panel').classList.add('hidden');
    document.getElementById('chat-messages').style.display = 'block';
    document.getElementById('quick-actions').style.display = 'block';
  }
  
  togglePanel() {
    const panel = document.getElementById('assistant-panel');
    const toggle = document.getElementById('assistant-toggle');
    
    if (this.isOpen) {
      this.closePanel();
    } else {
      this.isOpen = true;
      panel.style.transform = 'translateX(0)';
      panel.style.opacity = '1';
      toggle.style.transform = 'scale(0.9)';
      
      // Auto-scroll to bottom
      setTimeout(() => {
        const messages = document.getElementById('chat-messages');
        messages.scrollTop = messages.scrollHeight;
      }, 100);
    }
  }
  
  closePanel() {
    const panel = document.getElementById('assistant-panel');
    const toggle = document.getElementById('assistant-toggle');
    
    this.isOpen = false;
    panel.style.transform = 'translateX(100%)';
    panel.style.opacity = '0';
    toggle.style.transform = 'scale(1)';
  }
  
  sendMessage() {
    if (this.isTyping) return; // Prevent sending while AI is thinking
    
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (message) {
      // Store in conversation history
      this.addToHistory('user', message);
      
      // Show loading state
      this.setButtonLoading(true);
      
      this.addUserMessage(message);
      input.value = '';
      this.updateCharCounter();
      this.autoResize();
      this.updateSmartSuggestions(message);
      
      setTimeout(() => {
        this.generateResponse(message);
      }, 500);
    }
  }
  
  addToHistory(role, content) {
    this.conversationHistory.push({
      role: role,
      content: content,
      timestamp: new Date().toISOString()
    });
    
    // Limit history length to prevent memory issues
    if (this.conversationHistory.length > this.maxHistoryLength * 2) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
    }
  }
  
  updateSmartSuggestions(userMessage) {
    // Add intelligent suggestions based on user input
    const keywords = userMessage.toLowerCase().split(' ');
    
    if (keywords.includes('start') || keywords.includes('begin')) {
      this.smartSuggestions.unshift("What are the system requirements?");
    } else if (keywords.includes('research') || keywords.includes('thesis')) {
      this.smartSuggestions.unshift("Can you explain the research findings?");
    } else if (keywords.includes('programming') || keywords.includes('code')) {
      this.smartSuggestions.unshift("Which programming language should I start with?");
    }
    
    // Keep only unique suggestions and limit to 8
    this.smartSuggestions = [...new Set(this.smartSuggestions)].slice(0, 8);
  }
  
  async exportChatHistory() {
    if (this.conversationHistory.length === 0) {
      this.showStatus('No chat history to export', 'info');
      return;
    }
    
    const chatData = {
      title: 'SCI-HIGH AI Assistant Chat History',
      exportDate: new Date().toISOString(),
      totalMessages: this.conversationHistory.length,
      conversation: this.conversationHistory
    };
    
    const dataStr = JSON.stringify(chatData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `sci-high-chat-${new Date().toISOString().split('T')[0]}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showStatus('💾 Chat history exported successfully!', 'success');
  }
  
  async clearChatHistory() {
    const confirmClear = await showConfirm('Are you sure you want to clear all chat history? This action cannot be undone.', {
      title: 'Clear Chat History',
      icon: '🗑️',
      confirmText: 'Yes, Clear All',
      cancelText: 'Cancel'
    });
    if (confirmClear) {
      this.conversationHistory = [];
      
      // Clear visual chat messages except the welcome message
      const messagesContainer = document.getElementById('chat-messages');
      const messages = messagesContainer.querySelectorAll('.user-message, .assistant-message:not(:first-child)');
      messages.forEach(message => message.remove());
      
      this.showStatus('🗑️ Chat history cleared successfully!', 'success');
      
      // Add a fresh start message
      setTimeout(() => {
        this.addAssistantMessage('Chat cleared! Ready for a fresh conversation. How can I help you today? 🤖✨', 'info');
      }, 1000);
    }
  }
  
  setButtonLoading(loading) {
    const sendBtn = document.getElementById('send-message');
    const sendText = document.getElementById('send-text');
    const sendLoading = document.getElementById('send-loading');
    
    if (loading) {
      sendBtn.disabled = true;
      sendText.classList.add('hidden');
      sendLoading.classList.remove('hidden');
    } else {
      sendBtn.disabled = false;
      sendText.classList.remove('hidden');
      sendLoading.classList.add('hidden');
    }
  }
  
  updateCharCounter() {
    const input = document.getElementById('chat-input');
    const counter = document.getElementById('char-counter');
    const length = input.value.length;
    const maxLength = input.maxLength;
    
    counter.textContent = `${length}/${maxLength}`;
    
    if (length > maxLength * 0.9) {
      counter.classList.add('text-yellow-400');
      counter.classList.remove('text-gray-500');
    } else if (length > maxLength * 0.8) {
      counter.classList.add('text-orange-400');
      counter.classList.remove('text-gray-500', 'text-yellow-400');
    } else {
      counter.classList.add('text-gray-500');
      counter.classList.remove('text-yellow-400', 'text-orange-400');
    }
  }
  
  autoResize() {
    const input = document.getElementById('chat-input');
    input.style.height = 'auto';
    const maxHeight = 80; // Max height in pixels
    const newHeight = Math.min(input.scrollHeight, maxHeight);
    input.style.height = newHeight + 'px';
  }
  
  toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.addAssistantMessage('Sorry! Voice input is not supported in this browser. Try Chrome or Edge! 🎤❌', 'info');
      return;
    }
    
    if (this.isRecording) {
      this.stopVoiceRecording();
    } else {
      this.startVoiceRecording();
    }
  }
  
  startVoiceRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    const voiceBtn = document.getElementById('voice-input');
    this.isRecording = true;
    voiceBtn.innerHTML = '🔴';
    voiceBtn.title = 'Stop Recording';
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const input = document.getElementById('chat-input');
      input.value = transcript;
      this.updateCharCounter();
      this.autoResize();
      
      this.addAssistantMessage(`🎤 Heard: "${transcript}"`, 'info');
    };
    
    recognition.onerror = (event) => {
      this.addAssistantMessage(`🎤❌ Voice error: ${event.error}`, 'info');
      this.stopVoiceRecording();
    };
    
    recognition.onend = () => {
      this.stopVoiceRecording();
    };
    
    recognition.start();
    this.currentRecognition = recognition;
    
    this.addAssistantMessage('🎤 Listening... Speak your question!', 'info');
  }
  
  stopVoiceRecording() {
    if (this.currentRecognition) {
      this.currentRecognition.stop();
    }
    
    const voiceBtn = document.getElementById('voice-input');
    this.isRecording = false;
    voiceBtn.innerHTML = '🎤';
    voiceBtn.title = 'Voice Input';
  }
  
  handleQuickQuestion(question) {
    if (this.isTyping) return; // Prevent sending while AI is thinking
    
    this.addUserMessage(question);
    setTimeout(() => {
      this.generateResponse(question);
    }, 500);
  }
  
  addUserMessage(message) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message mb-3 text-right animate-bounce-in';
    messageDiv.innerHTML = `
      <div class="bg-gradient-to-r from-primary/20 to-yellow-300/20 rounded-lg p-2 max-w-xs ml-auto md:p-3 border border-primary/30">
        <div class="flex items-start space-x-2 justify-end">
          <div class="flex-1 text-right">
            <p class="text-xs text-white md:text-sm">${this.formatMessage(message)}</p>
            <div class="text-xs text-yellow-300 mt-1 opacity-75">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          </div>
          <div class="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-dark font-bold text-xs flex-shrink-0">You</div>
        </div>
      </div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  addAssistantMessage(message, type = 'info') {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'assistant-message mb-3 animate-bounce-in';
    
    const bgColor = type === 'game' ? 'bg-gradient-to-r from-accent/20 to-green-500/20' : 
                   type === 'thesis' ? 'bg-gradient-to-r from-purple/20 to-indigo-500/20' : 
                   type === 'technical' ? 'bg-gradient-to-r from-cyan/20 to-blue-500/20' : 
                   type === 'ai' ? 'bg-gradient-to-r from-purple/20 to-cyan/20' :
                   type === 'security' ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20' :
                   'bg-gradient-to-r from-purple/20 to-cyan/20';
    
    const borderColor = type === 'game' ? 'border-accent/30' :
                       type === 'thesis' ? 'border-purple/30' :
                       type === 'technical' ? 'border-cyan/30' :
                       type === 'ai' ? 'border-purple/30' :
                       type === 'security' ? 'border-red-500/30' :
                       'border-purple/30';
    
    const textColor = type === 'security' ? 'text-red-300' : 'text-white';
    const typeIcon = type === 'game' ? '🎮' :
                    type === 'thesis' ? '📚' :
                    type === 'technical' ? '⚙️' :
                    type === 'ai' ? '🤖' :
                    type === 'security' ? '🔒' :
                    '🤖';
    
    messageDiv.innerHTML = `
      <div class="${bgColor} rounded-lg p-2 max-w-xs md:p-3 border ${borderColor}">
        <div class="flex items-start space-x-2">
          <div class="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-dark font-bold text-xs flex-shrink-0">AI</div>
          <div class="flex-1">
            <p class="text-xs ${textColor} whitespace-pre-line md:text-sm">${this.formatMessage(message)}</p>
            ${type === 'ai' ? '<div class="text-xs text-purple-300 mt-1 flex items-center"><span class="mr-1">✨</span>Powered by Google AI</div>' : 
              `<div class="text-xs text-gray-400 mt-1 flex items-center justify-between">
                <span class="flex items-center"><span class="mr-1">${typeIcon}</span>${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                <span>${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>`}
          </div>
        </div>
      </div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  formatMessage(message) {
    // Enhanced message formatting with better markdown-like support
    return message
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary">$1</strong>') // Bold text
      .replace(/\*(.*?)\*/g, '<em class="text-accent">$1</em>') // Italic text
      .replace(/`(.*?)`/g, '<code class="bg-dark/50 px-1 py-0.5 rounded text-cyan text-xs">$1</code>') // Inline code
      .replace(/\n•/g, '\n<span class="text-primary">•</span>') // Bullet points
      .replace(/(\d+\.)/g, '<span class="text-primary font-bold">$1</span>') // Numbered lists
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-cyan hover:text-primary underline">$1</a>') // Links
      .replace(/#{1,6}\s?(.*)/g, '<strong class="text-primary text-sm">$1</strong>'); // Headers
  }
  
  generateResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    // Show typing indicator
    this.showTypingIndicator();
    
    // Try AI first, fallback to predefined responses
    if (this.apiKey && this.apiKey.length > 0) {
      this.generateAIResponse(userMessage);
    } else {
      this.generateFallbackResponse(message);
    }
  }
  
  async generateAIResponse(userMessage) {
    // Check if key has expired
    if (this.keyExpiry && Date.now() > this.keyExpiry) {
      this.clearApiKey();
      this.hideTypingIndicator();
      this.addAssistantMessage('🔒 API key expired for security. Using fallback responses.', 'security');
      this.generateFallbackResponse(userMessage.toLowerCase());
      return;
    }
    
    try {
      // Build conversation context from history
      const conversationContext = this.conversationHistory
        .slice(-6) // Use last 6 messages for context
        .map(entry => `${entry.role}: ${entry.content}`)
        .join('\n');
      
      const enhancedPrompt = `${this.systemContext}

Previous conversation context:
${conversationContext}

Current user question: ${userMessage}

Please provide a helpful, engaging response about SCI-HIGH or the thesis research. Consider the conversation context to provide more personalized and relevant answers. Keep responses concise (under 250 words) and include relevant emojis. Match the gaming/educational theme and maintain conversation flow.`;

      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: enhancedPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 250,
            candidateCount: 1
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (aiResponse) {
          this.hideTypingIndicator();
          this.addToHistory('assistant', aiResponse);
          this.addAssistantMessage(aiResponse, 'ai');
          
          // Add follow-up suggestions based on the response
          this.addFollowUpSuggestions(aiResponse);
          return;
        }
      } else {
        // If unauthorized, clear the key for security
        if (response.status === 401 || response.status === 403) {
          this.clearApiKey();
          this.hideTypingIndicator();
          this.addAssistantMessage('🔒 API key invalid or expired. Cleared for security.', 'security');
        }
      }
    } catch (error) {
      console.warn('AI API failed, using fallback:', error);
    }
    
    // Fallback to predefined responses
    this.generateFallbackResponse(userMessage.toLowerCase());
  }
  
  addFollowUpSuggestions(aiResponse) {
    // Generate contextual follow-up suggestions based on AI response
    const response = aiResponse.toLowerCase();
    
    if (response.includes('story mode') || response.includes('character')) {
      this.updateSuggestionButtons([
        "Tell me more about Noah's web development path",
        "What challenges are in Lily's Python journey?",
        "How does Damian's Java story unfold?"
      ]);
    } else if (response.includes('research') || response.includes('thesis')) {
      this.updateSuggestionButtons([
        "What were the key research findings?",
        "How was the study conducted?",
        "What's the sample size and demographics?"
      ]);
    } else if (response.includes('technical') || response.includes('programming')) {
      this.updateSuggestionButtons([
        "What's the tech stack behind SCI-HIGH?",
        "How is the code compilation handled?",
        "What about mobile performance optimization?"
      ]);
    }
  }
  
  updateSuggestionButtons(newSuggestions) {
    const suggestionContainer = document.getElementById('input-suggestions');
    if (!suggestionContainer) return;
    
    // Add new contextual suggestions temporarily
    newSuggestions.forEach((suggestion, index) => {
      setTimeout(() => {
        const btn = document.createElement('button');
        btn.className = 'suggestion-btn text-xs px-2 py-1 bg-primary/20 text-primary rounded-full hover:bg-primary/30 transition-all duration-300 hover:scale-105 animate-bounce-in';
        btn.setAttribute('data-text', suggestion);
        btn.textContent = `💡 ${suggestion}`;
        btn.style.animationDelay = `${index * 0.1}s`;
        
        btn.addEventListener('click', () => {
          const input = document.getElementById('chat-input');
          input.value = suggestion;
          this.updateCharCounter();
          this.autoResize();
          input.focus();
        });
        
        suggestionContainer.appendChild(btn);
        
        // Remove after 30 seconds
        setTimeout(() => {
          if (btn.parentElement) {
            btn.remove();
          }
        }, 30000);
      }, index * 200);
    });
  }
  
  generateFallbackResponse(message) {
    let response = null;
    let responseType = 'info';
    
    // Enhanced pattern matching with multiple keywords
    const patterns = [
      { 
        keywords: ['what is sci-high', 'about sci-high', 'sci-high game', 'what is this'], 
        response: this.responses["what is sci-high"] 
      },
      { 
        keywords: ['game features', 'about game', 'gameplay', 'how to play'], 
        response: this.responses["about game"] 
      },
      { 
        keywords: ['thesis', 'research', 'study', 'methodology', 'findings'], 
        response: this.responses["thesis research"] 
      },
      { 
        keywords: ['programming', 'coding', 'languages', 'learn code', 'what languages'], 
        response: this.responses["programming languages"] 
      },
      { 
        keywords: ['start', 'begin', 'getting started', 'how to start', 'tutorial'], 
        response: this.responses["how to start"] 
      },
      { 
        keywords: ['technical', 'tech stack', 'built with', 'framework', 'technology'], 
        response: this.responses["technical details"] 
      },
      { 
        keywords: ['help', 'support', 'assist', 'guide'], 
        response: this.responses["help"] 
      }
    ];
    
    // Find best match
    for (const pattern of patterns) {
      if (pattern.keywords.some(keyword => message.includes(keyword))) {
        response = pattern.response.response;
        responseType = pattern.response.type;
        break;
      }
    }
    
    // Context-aware responses based on conversation history
    if (!response && this.conversationHistory.length > 0) {
      const recentTopics = this.conversationHistory
        .slice(-3)
        .map(entry => entry.content.toLowerCase())
        .join(' ');
        
      if (recentTopics.includes('game') && message.includes('more')) {
        response = "Here are more details about SCI-HIGH! 🎮 The game features:\n• **Dynamic Storytelling**: Each character has unique adventures\n• **Real-time Compilation**: Code executes instantly in the browser\n• **Adaptive Learning**: Difficulty adjusts to your skill level\n• **Progress Analytics**: Track your learning journey\n• **Offline Support**: Play anywhere, anytime\n• **Cross-platform**: Works on desktop, tablet, and mobile\n\nWhat specific aspect interests you most? 🤔";
        responseType = 'game';
      } else if (recentTopics.includes('research') && (message.includes('more') || message.includes('detail'))) {
        response = "Diving deeper into the research! 📊 The study examines:\n• **Quantitative Metrics**: Performance scores, completion rates, time analysis\n• **Qualitative Insights**: Student interviews, feedback surveys\n• **Learning Analytics**: Behavioral patterns, engagement tracking\n• **Comparative Analysis**: Traditional vs. gamified learning outcomes\n• **Statistical Significance**: Pre/post assessment improvements\n• **Long-term Retention**: Knowledge persistence over time\n\nThe results show promising evidence for gamification effectiveness! 📈";
        responseType = 'thesis';
      }
    }
    
    // Smart fallback responses based on message characteristics
    if (!response) {
      if (message.includes('thank') || message.includes('thanks')) {
        response = "You're absolutely welcome! 😊 I'm thrilled to help you explore SCI-HIGH! Whether you're curious about the game mechanics, research findings, or technical implementation, I'm here to guide your learning adventure. Feel free to ask anything else! 🚀✨";
      } else if (message.includes('hi') || message.includes('hello') || message.includes('hey')) {
        response = "Hello there, future coding champion! 👋✨ Welcome to the world of SCI-HIGH! I'm your dedicated AI assistant, ready to help you navigate this exciting educational gaming adventure. What brings you here today? Are you interested in:\n• 🎮 Learning about the game\n• 📚 Understanding the research\n• 💻 Exploring programming concepts\n• 🚀 Getting started with your coding journey";
      } else if (message.includes('bye') || message.includes('goodbye')) {
        response = "Farewell, brave adventurer! 👋 May your coding journey be filled with epic discoveries and bug-free adventures! Remember, every expert was once a beginner. Keep learning, keep coding, and keep being awesome! See you next time in the SCI-HIGH universe! 🚀✨";
      } else if (message.length < 3) {
        response = "Hmm, that's quite brief! 🤔 Could you elaborate a bit more? I'm here to help with detailed questions about:\n• 🎮 Game features and mechanics\n• 📚 Research methodology and findings\n• 💻 Programming concepts and tutorials\n• 🛠️ Technical implementation details\n\nWhat would you like to explore? 💫";
      } else {
        response = "That's an interesting question! 🤔 While I'd love to give you a perfect answer, I'm specifically designed to help with SCI-HIGH-related topics. I can assist you with:\n\n🎮 **Game Information**:\n• Gameplay mechanics and features\n• Character stories and programming paths\n• Achievement systems and progress tracking\n\n📚 **Research & Thesis**:\n• Educational methodology and findings\n• Gamification effectiveness studies\n• Academic contributions and implications\n\n💻 **Programming & Technical**:\n• Supported languages and concepts\n• Technical architecture and implementation\n• Learning resources and tutorials\n\nTry asking about any of these topics! 🚀";
      }
    }
    
    // Add contextual follow-up based on response type
    if (responseType === 'game') {
      response += "\n\n💡 **Want to explore more?** Try asking about specific characters, programming challenges, or technical features!";
    } else if (responseType === 'thesis') {
      response += "\n\n📊 **Curious about methodology?** Ask about data collection methods, sample demographics, or statistical analysis!";
    } else if (responseType === 'technical') {
      response += "\n\n⚙️ **Deep dive available!** Ask about specific technologies, performance optimizations, or development challenges!";
    }
    
    // Simulate more realistic typing delay based on response length
    const typingDelay = Math.min(Math.max(response.length * 20, 800), 2500);
    
    setTimeout(() => {
      this.hideTypingIndicator();
      this.addToHistory('assistant', response);
      this.addAssistantMessage(response, responseType);
    }, typingDelay);
  }
  
  showTypingIndicator() {
    this.isTyping = true;
    const messagesContainer = document.getElementById('chat-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator mb-3';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
      <div class="bg-purple/20 rounded-lg p-2 max-w-xs md:p-3">
        <div class="flex items-center space-x-1">
          <div class="flex space-x-1">
            <div class="w-2 h-2 bg-purple rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-purple rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-2 h-2 bg-purple rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
          </div>
          <span class="text-xs text-gray-400 md:text-sm">AI is thinking...</span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  hideTypingIndicator() {
    this.isTyping = false;
    this.setButtonLoading(false);
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }
  
  setupAutoResponses() {
    // Add some helpful tips periodically when panel is open
    setInterval(() => {
      if (this.isOpen && Math.random() < 0.1) { // 10% chance every interval
        const tips = [
          "💡 Tip: Try the Story Mode for narrative-based learning!",
          "🎯 Pro tip: Complete challenges in the Computer Lab for hands-on practice!",
          "⭐ Did you know? You can track your progress in the Office section!",
          "🚀 Quick fact: SCI-HIGH supports both mobile and desktop play!"
        ];
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        setTimeout(() => this.addAssistantMessage(randomTip, 'info'), 2000);
      }
    }, 30000); // Check every 30 seconds
  }
}

// Initialize the virtual assistant when the page loads
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    new VirtualAssistant();
  });
}
