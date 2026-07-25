// Career Stats Service for SCI-HIGH Game
// Handles student career statistics and session tracking
// Firebase initialization now delegated to centralized firebaseInit.js
import { ensureFirebaseApp, getFirebaseDatabase } from './firebaseInit.js';

class CareerStatsService {
    constructor() {
        this.isFirebaseInitialized = false;
        this.database = null;
        this.initializationPromise = null;
    }

    // Determine if current session is a guest user (no server writes)
    isGuestUser() {
        try {
            const userType = localStorage.getItem('sci_high_user_type');
            if (userType && userType.toLowerCase() === 'guest') return true;
            // Fallback: inspect stored user object
            const userStr = localStorage.getItem('sci_high_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                // Some flows may tag name/uid
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
            this.database = await getFirebaseDatabase();

            // Connection test
            await this.database.ref('.info/connected').once('value');
            this.isFirebaseInitialized = true;
        } catch (error) {
            console.error('Failed to initialize Firebase for CareerStatsService:', error);
            this.isFirebaseInitialized = false;
            throw error;
        }
    }

    // Update student career stats with new session data
    async updateCareerStats(studentId, studentName, sessionData, additionalData = {}) {
        try {
            // Skip any Firebase writes for guest users
            if (this.isGuestUser()) {
                console.info('CareerStatsService: Skipping Firebase write for guest user');
                return { success: true, skipped: true, reason: 'guest-user' };
            }
            
            // Validate and sanitize sessionData to prevent NaN values
            if (!sessionData) {
                throw new Error('Session data is required');
            }
            
            // Ensure all numeric values are valid
            sessionData.totalScore = parseInt(sessionData.totalScore) || 0;
            sessionData.correctAnswers = parseInt(sessionData.correctAnswers) || 0;
            sessionData.wrongAnswers = parseInt(sessionData.wrongAnswers) || 0;
            sessionData.highestStreak = parseInt(sessionData.highestStreak) || 0;
            sessionData.accuracyPercentage = parseFloat(sessionData.accuracyPercentage) || 0;
            sessionData.sessionDuration = parseInt(sessionData.sessionDuration) || 0;
            
            // Ensure courseTopic exists (critical for career stats)
            if (!sessionData.courseTopic || sessionData.courseTopic.trim() === '') {
                console.warn('⚠️ CareerStatsService: courseTopic is missing or empty, using "unknown"');
                sessionData.courseTopic = 'unknown';
            }
            
            // Ensure timestamp exists
            if (!sessionData.timestamp) {
                sessionData.timestamp = new Date().toISOString();
            }
            
            
            const isInitialized = await this.ensureFirebaseInitialized();
            if (!isInitialized) {
                throw new Error('Firebase not initialized');
            }

            const statsRef = this.database.ref(`student_career_stats/${studentId}`);
            
            // Get current stats
            const currentStatsSnapshot = await statsRef.once('value');
            const currentStats = currentStatsSnapshot.val() || {};
            
            // Initialize default structure if first time
            if (!currentStats.careerStats) {
                currentStats.careerStats = {
                    totalSessions: 0,
                    totalPoints: 0,
                    totalCorrectAnswers: 0,
                    totalWrongAnswers: 0,
                    averageAccuracy: 0,
                    highestStreak: 0,
                    coursesCompleted: {},
                    courseCompletionStatus: {
                        python: false,
                        java: false,
                        csharp: false,
                        cpp: false,  // C++
                        c: false,    // C
                        webdesign: false
                    }
                };
            }
            
            // Ensure courseCompletionStatus exists (for existing users)
            if (!currentStats.careerStats.courseCompletionStatus) {
                currentStats.careerStats.courseCompletionStatus = {
                    python: false,
                    java: false,
                    csharp: false,
                    cpp: false,
                    c: false,
                    webdesign: false
                };
            }
            
            if (!currentStats.recentSessions) {
                currentStats.recentSessions = {};
            }

            // Update career stats
            const newCareerStats = {
                ...currentStats.careerStats,
                totalSessions: (currentStats.careerStats.totalSessions || 0) + 1,
                totalPoints: (currentStats.careerStats.totalPoints || 0) + sessionData.totalScore,
                totalCorrectAnswers: (currentStats.careerStats.totalCorrectAnswers || 0) + sessionData.correctAnswers,
                totalWrongAnswers: (currentStats.careerStats.totalWrongAnswers || 0) + sessionData.wrongAnswers,
                highestStreak: Math.max(
                    parseInt(currentStats.careerStats.highestStreak) || 0, 
                    parseInt(sessionData.highestStreak) || 0
                )
            };

            // Calculate new average accuracy
            const totalAnswers = newCareerStats.totalCorrectAnswers + newCareerStats.totalWrongAnswers;
            newCareerStats.averageAccuracy = totalAnswers > 0 ? 
                parseFloat(((newCareerStats.totalCorrectAnswers / totalAnswers) * 100).toFixed(1)) : 0;

            // Update course-specific stats
            const courseTopic = sessionData.courseTopic;
            if (courseTopic) {
                // Normalize course name for consistency
                const normalizedCourse = courseTopic.toLowerCase().replace(/\+/g, 'p'); // C++ becomes cpp
                
                if (!newCareerStats.coursesCompleted[courseTopic]) {
                    newCareerStats.coursesCompleted[courseTopic] = {
                        completedCount: 0,
                        totalPoints: 0,
                        bestAccuracy: 0,
                        lastCompleted: null
                    };
                }

                const courseStats = newCareerStats.coursesCompleted[courseTopic];
                courseStats.completedCount += 1;
                courseStats.totalPoints += sessionData.totalScore;
                
                // Safely handle accuracy calculation to prevent NaN
                const sessionAccuracy = parseFloat(sessionData.accuracyPercentage) || 0;
                const currentBestAccuracy = parseFloat(courseStats.bestAccuracy) || 0;
                courseStats.bestAccuracy = Math.max(currentBestAccuracy, sessionAccuracy);
                
                courseStats.lastCompleted = sessionData.timestamp;

                // Only set course completion to true if the course was actually completed (reached Intensity 3)
                if (sessionData.courseCompleted === true) {
                    if (newCareerStats.courseCompletionStatus.hasOwnProperty(normalizedCourse)) {
                        newCareerStats.courseCompletionStatus[normalizedCourse] = true;
                    } else if (newCareerStats.courseCompletionStatus.hasOwnProperty(courseTopic.toLowerCase())) {
                        newCareerStats.courseCompletionStatus[courseTopic.toLowerCase()] = true;
                    }
                } else {
                }
            }

            // Update recent sessions (keep only last 3)
            const newRecentSessions = { ...currentStats.recentSessions };
            
            // Shift existing sessions
            if (newRecentSessions.session1) {
                newRecentSessions.session3 = newRecentSessions.session2;
                newRecentSessions.session2 = newRecentSessions.session1;
            } else if (newRecentSessions.session2) {
                newRecentSessions.session3 = newRecentSessions.session2;
            }
            
            // Add new session as session1
            newRecentSessions.session1 = {
                courseTopic: sessionData.courseTopic,
                totalScore: sessionData.totalScore,
                correctAnswers: sessionData.correctAnswers,
                wrongAnswers: sessionData.wrongAnswers,
                accuracyPercentage: sessionData.accuracyPercentage,
                highestStreak: sessionData.highestStreak,
                timestamp: sessionData.timestamp,
                sessionDuration: sessionData.sessionDuration
            };

            // Update complete stats structure
            const updatedStats = {
                studentInfo: {
                    studentId: studentId,
                    fullName: studentName, // Always store the complete name here
                    lastUpdated: new Date().toISOString()
                },
                careerStats: newCareerStats,
                recentSessions: newRecentSessions,
                // Enhanced name handling for additional form data
                firstName: additionalData.firstName || (studentName ? studentName.split(' ')[0] : '') || '',
                lastName: additionalData.lastName || (studentName ? studentName.split(' ').slice(1).join(' ') : '') || '',
                middleName: additionalData.middleName || '', // Add support for middle names
                fullName: additionalData.fullName || studentName || '', // Ensure fullName is always stored
                department: additionalData.department || 'Unknown',
                strandYear: additionalData.strandYear || 'Unknown'
            };

            // Merge Bloom stats (sessionData.bloomStats -> cumulative careerStats.bloomStats)
            try {
                const sessionBloom = sessionData.bloomStats;
                if (sessionBloom && typeof sessionBloom === 'object') {
                    const existingBloom = currentStats.careerStats.bloomStats || {};
                    const merged = { ...existingBloom };
                    const levels = ['remembering','understanding','applying','analyzing','evaluating','creating'];
                    levels.forEach(l => {
                        const prev = merged[l] || { correct:0, total:0 };
                        const curr = sessionBloom[l] || { correct:0, total:0 };
                        merged[l] = {
                            correct: (parseInt(prev.correct)||0) + (parseInt(curr.correct)||0),
                            total: (parseInt(prev.total)||0) + (parseInt(curr.total)||0)
                        };
                    });
                    updatedStats.careerStats.bloomStats = merged;
                }
            } catch(e) {
                console.warn('Bloom stats merge failed:', e);
            }

            // Sanitize the data to remove any NaN values before saving
            const sanitizedStats = this.sanitizeDataForFirebase(updatedStats);
            
            // Save to Firebase
            await statsRef.set(sanitizedStats);
            
            return { success: true, data: sanitizedStats };

        } catch (error) {
            console.error('❌ CareerStatsService: Error updating career stats:', error);
            console.error('❌ CareerStatsService: Error details:', error.message);
            console.error('❌ CareerStatsService: Error stack:', error.stack);
            
            // Check for specific Firebase permission errors
            if (error.code === 'PERMISSION_DENIED') {
                console.error('🚫 CareerStatsService: Firebase permission denied - check rules');
            }
            
            throw error;
        }
    }

    // Sanitize data to remove NaN values that would break Firebase
    sanitizeDataForFirebase(obj) {
        if (obj === null || obj === undefined) {
            return null; // Convert undefined to null for Firebase
        }
        
        if (typeof obj === 'number') {
            return isNaN(obj) ? 0 : obj;
        }
        
        if (typeof obj === 'string') {
            return obj.trim() === '' ? 'unknown' : obj; // Convert empty strings to 'unknown'
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeDataForFirebase(item));
        }
        
        if (typeof obj === 'object') {
            const sanitized = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const sanitizedValue = this.sanitizeDataForFirebase(obj[key]);
                    if (sanitizedValue !== null) { // Only include non-null values
                        sanitized[key] = sanitizedValue;
                    }
                }
            }
            return sanitized;
        }
        
        return obj;
    }

    // Get student career stats
    async getCareerStats(studentId) {
        try {
            const isInitialized = await this.ensureFirebaseInitialized();
            if (!isInitialized) {
                throw new Error('Firebase not initialized');
            }

            const statsRef = this.database.ref(`student_career_stats/${studentId}`);
            const snapshot = await statsRef.once('value');
            
            return snapshot.val() || null;

        } catch (error) {
            console.error('Error getting career stats:', error);
            throw error;
        }
    }

    // Get leaderboard of top students by total points
    async getTopStudents(limit = 10) {
        try {
            const isInitialized = await this.ensureFirebaseInitialized();
            if (!isInitialized) {
                throw new Error('Firebase not initialized');
            }

            const statsRef = this.database.ref('student_career_stats');
            const snapshot = await statsRef.orderByChild('careerStats/totalPoints')
                                         .limitToLast(limit)
                                         .once('value');
            
            const students = [];
            snapshot.forEach(child => {
                const data = child.val();
                students.push({
                    studentId: child.key,
                    studentName: data.studentInfo?.fullName || 'Unknown',
                    totalPoints: data.careerStats?.totalPoints || 0,
                    totalSessions: data.careerStats?.totalSessions || 0,
                    averageAccuracy: data.careerStats?.averageAccuracy || 0
                });
            });

            // Sort descending by points (since Firebase returns ascending)
            return students.reverse();

        } catch (error) {
            console.error('Error getting top students:', error);
            throw error;
        }
    }

    // Get course completion summary for a student
    getCourseCompletionSummary(careerStats) {
        if (!careerStats || !careerStats.courseCompletionStatus) {
            return {
                completed: [],
                notCompleted: [],
                totalCompleted: 0,
                completionPercentage: 0
            };
        }

        const completed = [];
        const notCompleted = [];
        const courseNames = {
            python: 'Python',
            java: 'Java',
            csharp: 'C#',
            cpp: 'C++',
            c: 'C',
            webdesign: 'Web Design'
        };

        Object.entries(careerStats.courseCompletionStatus).forEach(([courseKey, isCompleted]) => {
            const courseName = courseNames[courseKey] || courseKey.toUpperCase();
            if (isCompleted) {
                completed.push(courseName);
            } else {
                notCompleted.push(courseName);
            }
        });

        const totalCourses = Object.keys(careerStats.courseCompletionStatus).length;
        const completionPercentage = totalCourses > 0 ? 
            Math.round((completed.length / totalCourses) * 100) : 0;

        return {
            completed,
            notCompleted,
            totalCompleted: completed.length,
            completionPercentage
        };
    }
}

// Create and export singleton instance
const careerStatsService = new CareerStatsService();
export default careerStatsService;
