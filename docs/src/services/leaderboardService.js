// Leaderboard Service for SCI-HIGH Game
// Handles communication between the game and Firebase leaderboard
// Firebase initialization now delegated to centralized firebaseInit.js
import { ensureFirebaseApp, getFirebaseDatabase } from './firebaseInit.js';

class LeaderboardService {
    constructor() {
        this.isFirebaseInitialized = false;
        this.db = null;
        this.initializationPromise = null;
        this._contestEndMs = null; // cached contest end timestamp
    }

    // Contest end gate: resolve end date from leaderboard config or Firebase
    async getContestEndMs() {
        if (typeof this._contestEndMs === 'number') return this._contestEndMs;

        // Single source of truth: local config date
        let localEndMs = 0;
        try {
            const mod = await import('../../js/leaderboards/config.js');
            if (mod && typeof mod.getContestEndDate === 'function') {
                const d = mod.getContestEndDate();
                if (d && !isNaN(d.getTime())) localEndMs = d.getTime();
            }
        } catch (_) {}
        const chosen = localEndMs || new Date(2025, 9, 17, 23, 59, 59).getTime();
        try {
            console.info('[LeaderboardService][ContestEndMs]', {
                localEndMs,
                localEndLocal: localEndMs ? new Date(localEndMs).toString() : null,
                chosen,
                chosenLocal: new Date(chosen).toString()
            });
        } catch(_) {}
        this._contestEndMs = chosen;
        return this._contestEndMs;
    }

    async isContestActive() {
        try {
            const endMs = await this.getContestEndMs();
            return Date.now() < endMs;
        } catch (_) { return true; }
    }

    // Determine if current session is a guest user (no server writes)
    isGuestUser() {
        try {
            const userType = localStorage.getItem('sci_high_user_type');
            if (userType && userType.toLowerCase() === 'guest') return true;
            const userStr = localStorage.getItem('sci_high_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                if ((user?.userType || '').toLowerCase() === 'guest') return true;
                if ((user?.role || '').toLowerCase() === 'guest') return true;
                if ((user?.displayName || '').toLowerCase() === 'guest') return true;
            }
        } catch {}
        return false;
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
            if (!navigator.onLine) {
                throw new Error('No internet connection detected');
            }

            // Centralized init (handles script loading + config resolution)
            await ensureFirebaseApp();
            this.db = await getFirebaseDatabase();

            // Connection test
            await this.db.ref('.info/connected').once('value');
            this.isFirebaseInitialized = true;
        } catch (error) {
            console.error('Failed to initialize Firebase:', error);
            this.isFirebaseInitialized = false;
            throw error;
        }
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
        // Stop writes after contest ends
        try {
            const active = await this.isContestActive();
            if (!active) {
                return { success: false, reason: 'contest-ended', message: 'Mini-contest period has ended. Score submissions are closed.' };
            }
        } catch (_) {}
        // Guests should not write to Firebase; use local storage fallback
        if (this.isGuestUser()) {
            console.info('LeaderboardService: Guest user, saving to local storage only');
            return this.saveToLocalStorage(playerData);
        }

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
            return { success: true, data: scoreData };
        } catch (error) {
            console.error('Error submitting score:', error);
            throw error;
        }
    }

    // Update score only if it's better than current best
    async updateBestScore(playerData) {
        // Stop writes after contest ends
        try {
            const active = await this.isContestActive();
            if (!active) {
                return { success: false, reason: 'contest-ended', message: 'Mini-contest period has ended. Score submissions are closed.' };
            }
        } catch (_) {}
        // Guests should not write to Firebase
        if (this.isGuestUser()) {
            return this.saveToLocalStorage(playerData);
        }

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
