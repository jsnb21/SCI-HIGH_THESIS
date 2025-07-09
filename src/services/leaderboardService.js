// Leaderboard Service for SCI-HIGH Game
// Handles communication between the game and Firebase leaderboard

class LeaderboardService {
    constructor() {
        this.firebaseConfig = {
            apiKey: "AIzaSyD-Q2woACHgMCTVwd6aX-IUzLovE0ux-28",
            authDomain: "sci-high-website.firebaseapp.com",
            databaseURL: "https://sci-high-website-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "sci-high-website",
            storageBucket: "sci-high-website.appspot.com",
            messagingSenderId: "451463202515",
            appId: "1:451463202515:web:e7f9c7bf69c04c685ef626"
        };
        
        this.isFirebaseInitialized = false;
        this.db = null;
        this.initializationPromise = null;
    }

    async ensureFirebaseInitialized() {
        if (this.isFirebaseInitialized) {
            return true;
        }
        
        if (!this.initializationPromise) {
            this.initializationPromise = this.initializeFirebase();
        }
        
        try {
            await this.initializationPromise;
            return this.isFirebaseInitialized;
        } catch (error) {
            console.warn('Firebase initialization failed:', error.message);
            return false;
        }
    }

    async initializeFirebase() {
        try {
            console.log('Starting Firebase initialization...');
            
            // First check if we have internet connectivity
            if (!navigator.onLine) {
                throw new Error('No internet connection detected');
            }
            
            // Check if Firebase is already loaded
            if (typeof window.firebase === 'undefined') {
                console.log('Loading Firebase scripts...');
                await this.loadFirebaseScripts();
            }
            
            // Wait a bit for Firebase to be available
            let retries = 0;
            while (typeof window.firebase === 'undefined' && retries < 10) {
                console.log(`Waiting for Firebase to load... (attempt ${retries + 1})`);
                await new Promise(resolve => setTimeout(resolve, 300));
                retries++;
            }
            
            if (typeof window.firebase === 'undefined') {
                throw new Error('Firebase failed to load after multiple attempts - check your internet connection');
            }
            
            // Initialize Firebase if not already done
            if (!window.firebase.apps.length) {
                console.log('Initializing Firebase app...');
                window.firebase.initializeApp(this.firebaseConfig);
            }
            
            // Test Firebase connection
            this.db = window.firebase.database();
            
            // Try a simple connection test
            await this.db.ref('.info/connected').once('value');
            
            this.isFirebaseInitialized = true;
            console.log('Firebase initialized successfully for leaderboard service');
        } catch (error) {
            console.error('Failed to initialize Firebase:', error);
            this.isFirebaseInitialized = false;
            throw error;
        }
    }

    async loadFirebaseScripts() {
        return new Promise((resolve, reject) => {
            // Check if Firebase is already loaded
            if (typeof window.firebase !== 'undefined') {
                console.log('Firebase scripts already loaded');
                resolve();
                return;
            }

            // Load Firebase scripts dynamically
            const scripts = [
                'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
                'https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js'
            ];
            
            let loaded = 0;
            let hasError = false;
            const timeout = setTimeout(() => {
                if (!hasError) {
                    hasError = true;
                    reject(new Error('Firebase script loading timeout - check your internet connection'));
                }
            }, 10000); // 10 second timeout
            
            const handleLoad = () => {
                loaded++;
                if (loaded === scripts.length && !hasError) {
                    clearTimeout(timeout);
                    console.log('All Firebase scripts loaded successfully');
                    // Wait a bit for Firebase to initialize
                    setTimeout(() => resolve(), 200);
                }
            };
            
            const handleError = (src) => {
                if (!hasError) {
                    hasError = true;
                    clearTimeout(timeout);
                    console.error(`Failed to load Firebase script: ${src}`);
                    reject(new Error(`Failed to load Firebase script from CDN - check your internet connection`));
                }
            };
            
            scripts.forEach((src) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = handleLoad;
                script.onerror = () => handleError(src);
                script.async = true;
                document.head.appendChild(script);
            });
        });
    }

    // Sanitize object keys for Firebase (remove invalid characters)
    sanitizeFirebaseKeys(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            // Replace invalid Firebase characters with safe alternatives
            const sanitizedKey = key
                .replace(/\./g, '_dot_')
                .replace(/#/g, '_sharp_')
                .replace(/\$/g, '_dollar_')
                .replace(/\//g, '_slash_')
                .replace(/\[/g, '_lbracket_')
                .replace(/\]/g, '_rbracket_');
            
            // Recursively sanitize nested objects
            if (typeof value === 'object' && value !== null) {
                sanitized[sanitizedKey] = this.sanitizeFirebaseKeys(value);
            } else {
                sanitized[sanitizedKey] = value;
            }
        }
        return sanitized;
    }

    // Restore object keys from Firebase format
    restoreFirebaseKeys(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        
        const restored = {};
        for (const [key, value] of Object.entries(obj)) {
            // Restore original characters
            const restoredKey = key
                .replace(/_dot_/g, '.')
                .replace(/_sharp_/g, '#')
                .replace(/_dollar_/g, '$')
                .replace(/_slash_/g, '/')
                .replace(/_lbracket_/g, '[')
                .replace(/_rbracket_/g, ']');
            
            // Recursively restore nested objects
            if (typeof value === 'object' && value !== null) {
                restored[restoredKey] = this.restoreFirebaseKeys(value);
            } else {
                restored[restoredKey] = value;
            }
        }
        return restored;
    }

    // Submit score to leaderboard
    async submitScore(playerData) {
        const isInitialized = await this.ensureFirebaseInitialized();
        
        if (!isInitialized) {
            throw new Error('Firebase initialization failed - leaderboard service unavailable');
        }

        const {
            userId,
            playerName,
            studentId = '',
            score,
            department = 'Unknown',
            gameData = {}
        } = playerData;

        // Validate input
        if (!userId || !playerName || score < 0) {
            throw new Error('Invalid player data');
        }

        try {
            const scoreData = {
                name: playerName,
                studentId: studentId,
                score: score,
                department: department,
                timestamp: Date.now(),
                submissionDate: new Date().toISOString(),
                gameData: {
                    totalPoints: gameData.totalPoints || score,
                    topicPoints: this.sanitizeFirebaseKeys(gameData.topicPoints || {}),
                    achievementCount: gameData.achievementCount || 0,
                    playTime: gameData.playTime || 0
                }
            };

            await this.db.ref('leaderboards/' + userId).set(scoreData);
            console.log('Score submitted successfully:', scoreData);
            return { success: true, data: scoreData };
        } catch (error) {
            console.error('Error submitting score:', error);
            throw error;
        }
    }

    // Update score only if it's better than current best
    async updateBestScore(playerData) {
        const isInitialized = await this.ensureFirebaseInitialized();
        
        if (!isInitialized) {
            console.warn('Firebase not available, using local storage fallback');
            return this.saveToLocalStorage(playerData);
        }

        const { userId } = playerData;
        
        try {
            const snapshot = await this.db.ref('leaderboards/' + userId).once('value');
            const existingData = snapshot.val();
            
            if (!existingData || playerData.score > existingData.score) {
                await this.submitScore(playerData);
                return { 
                    success: true, 
                    isNewBest: true, 
                    previousBest: existingData ? existingData.score : 0,
                    newBest: playerData.score
                };
            } else {
                return {
                    success: true,
                    isNewBest: false,
                    currentBest: existingData.score,
                    submittedScore: playerData.score
                };
            }
        } catch (error) {
            console.error('Error updating best score:', error);
            throw error;
        }
    }

    // Get player's current best score
    async getPlayerBestScore(userId) {
        const isInitialized = await this.ensureFirebaseInitialized();
        
        if (!isInitialized) {
            console.warn('Firebase not available, using local storage for player best score');
            return this.getLocalPlayerBestScore(userId);
        }

        try {
            const snapshot = await this.db.ref('leaderboards/' + userId).once('value');
            const data = snapshot.val();
            return data ? data.score : 0;
        } catch (error) {
            console.error('Error getting player best score:', error);
            return 0;
        }
    }

    // Get top scores for display
    async getTopScores(filter = 'overall', limit = 10) {
        const isInitialized = await this.ensureFirebaseInitialized();
        
        if (!isInitialized) {
            console.warn('Firebase not available, using local storage for top scores');
            const localScores = this.getLocalLeaderboard();
            return localScores.slice(0, limit);
        }

        try {
            const snapshot = await this.db.ref('leaderboards')
                .orderByChild('score')
                .limitToLast(100)
                .once('value');
            
            const scores = [];
            snapshot.forEach(child => {
                const data = child.val();
                // Restore Firebase keys to original format
                if (data.gameData && data.gameData.topicPoints) {
                    data.gameData.topicPoints = this.restoreFirebaseKeys(data.gameData.topicPoints);
                }
                scores.push({ id: child.key, ...data });
            });

            // Sort descending by score
            scores.sort((a, b) => b.score - a.score);

            // Apply filter
            let filtered = scores;
            if (filter === 'college') {
                filtered = scores.filter(entry => 
                    (entry.department || '').toLowerCase().includes('college')
                );
            } else if (filter === 'seniorhigh') {
                filtered = scores.filter(entry => 
                    (entry.department || '').toLowerCase().includes('senior')
                );
            } else if (filter === 'juniorhigh') {
                filtered = scores.filter(entry => 
                    (entry.department || '').toLowerCase().includes('junior')
                );
            }

            return filtered.slice(0, limit);
        } catch (error) {
            console.error('Error getting top scores:', error);
            return [];
        }
    }

    // Fallback local storage methods for offline mode
    saveToLocalStorage(playerData) {
        try {
            const localLeaderboard = JSON.parse(localStorage.getItem('sci_high_local_leaderboard') || '[]');
            
            // Check if player already exists
            const existingIndex = localLeaderboard.findIndex(entry => entry.userId === playerData.userId);
            
            if (existingIndex !== -1) {
                // Update if new score is better
                if (playerData.score > localLeaderboard[existingIndex].score) {
                    localLeaderboard[existingIndex] = {
                        ...playerData,
                        timestamp: Date.now(),
                        submissionDate: new Date().toISOString()
                    };
                    localStorage.setItem('sci_high_local_leaderboard', JSON.stringify(localLeaderboard));
                    return { success: true, isNewBest: true, newBest: playerData.score };
                } else {
                    return { success: true, isNewBest: false, currentBest: localLeaderboard[existingIndex].score };
                }
            } else {
                // Add new entry
                localLeaderboard.push({
                    ...playerData,
                    timestamp: Date.now(),
                    submissionDate: new Date().toISOString()
                });
                
                // Keep only top 100 scores
                localLeaderboard.sort((a, b) => b.score - a.score);
                if (localLeaderboard.length > 100) {
                    localLeaderboard.splice(100);
                }
                
                localStorage.setItem('sci_high_local_leaderboard', JSON.stringify(localLeaderboard));
                return { success: true, isNewBest: true, newBest: playerData.score };
            }
        } catch (error) {
            console.error('Failed to save to local storage:', error);
            throw new Error('Failed to save score locally');
        }
    }

    getLocalLeaderboard() {
        try {
            const localLeaderboard = JSON.parse(localStorage.getItem('sci_high_local_leaderboard') || '[]');
            return localLeaderboard.sort((a, b) => b.score - a.score);
        } catch (error) {
            console.error('Failed to get local leaderboard:', error);
            return [];
        }
    }

    getLocalPlayerBestScore(userId) {
        try {
            const localLeaderboard = this.getLocalLeaderboard();
            const playerEntry = localLeaderboard.find(entry => entry.userId === userId);
            return playerEntry ? playerEntry.score : 0;
        } catch (error) {
            console.error('Failed to get local player score:', error);
            return 0;
        }
    }

    // Generate unique user ID (you can enhance this)
    generateUserId(playerName = 'Player') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${playerName.replace(/\s+/g, '_').toLowerCase()}_${timestamp}_${random}`;
    }

    // Check if service is ready
    isReady() {
        return this.isFirebaseInitialized;
    }
}

// Export singleton instance
const leaderboardService = new LeaderboardService();
export default leaderboardService;
