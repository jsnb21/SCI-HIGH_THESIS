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

    getVerifiedFirebaseUser() {
        const user = window.firebase?.auth?.().currentUser;
        if (!user || user.isAnonymous) {
            throw new Error('A verified Firebase account is required for career statistics');
        }
        return user;
    }

    // Update student career stats with new session data
    async updateCareerStats() {
        return { success: false, skipped: true, reason: 'score-verification-required' };
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
    async getCareerStats(_studentId) {
        try {
            const isInitialized = await this.ensureFirebaseInitialized();
            if (!isInitialized) {
                throw new Error('Firebase not initialized');
            }

            const authUser = this.getVerifiedFirebaseUser();
            const statsRef = this.database.ref(`student_career_stats/${authUser.uid}`);
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
