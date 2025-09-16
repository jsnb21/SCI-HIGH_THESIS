// Career Stats Service for SCI-HIGH Game
// Handles student career statistics and session tracking

class CareerStatsService {
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
        this.database = null;
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
            console.log('Starting Firebase initialization for CareerStatsService...');
            
            if (!navigator.onLine) {
                throw new Error('No internet connection detected');
            }
            
            if (typeof window.firebase === 'undefined') {
                await this.loadFirebaseScripts();
            }
            
            let retries = 0;
            while (typeof window.firebase === 'undefined' && retries < 10) {
                console.log(`Waiting for Firebase to load... (attempt ${retries + 1})`);
                await new Promise(resolve => setTimeout(resolve, 300));
                retries++;
            }
            
            if (typeof window.firebase === 'undefined') {
                throw new Error('Firebase failed to load after multiple attempts');
            }
            
            if (!window.firebase.apps.length) {
                window.firebase.initializeApp(this.firebaseConfig);
            }
            
            this.database = window.firebase.database();
            await this.database.ref('.info/connected').once('value');
            
            this.isFirebaseInitialized = true;
            console.log('Firebase initialized successfully for CareerStatsService');
        } catch (error) {
            console.error('Failed to initialize Firebase for CareerStatsService:', error);
            this.isFirebaseInitialized = false;
            throw error;
        }
    }

    async loadFirebaseScripts() {
        return new Promise((resolve, reject) => {
            if (typeof window.firebase !== 'undefined') {
                resolve();
                return;
            }

            const scripts = [
                'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
                'https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js'
            ];
            
            let loaded = 0;
            const timeout = setTimeout(() => {
                reject(new Error('Firebase script loading timeout'));
            }, 10000);
            
            scripts.forEach(src => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => {
                    loaded++;
                    if (loaded === scripts.length) {
                        clearTimeout(timeout);
                        resolve();
                    }
                };
                script.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error(`Failed to load Firebase script: ${src}`));
                };
                document.head.appendChild(script);
            });
        });
    }

    // Update student career stats with new session data
    async updateCareerStats(studentId, studentName, sessionData, additionalData = {}) {
        try {
            console.log('🔄 CareerStatsService: Starting updateCareerStats...');
            console.log('📊 Input data:', { studentId, studentName, sessionData, additionalData });
            
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
            
            console.log('✅ CareerStatsService: Session data validated:', sessionData);
            
            const isInitialized = await this.ensureFirebaseInitialized();
            if (!isInitialized) {
                throw new Error('Firebase not initialized');
            }
            console.log('✅ CareerStatsService: Firebase initialized');

            const statsRef = this.database.ref(`student_career_stats/${studentId}`);
            console.log('🔗 CareerStatsService: Database reference created for:', `student_career_stats/${studentId}`);
            
            // Get current stats
            console.log('🔄 CareerStatsService: Fetching current stats...');
            const currentStatsSnapshot = await statsRef.once('value');
            const currentStats = currentStatsSnapshot.val() || {};
            console.log('📊 CareerStatsService: Current stats:', currentStats);
            
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
                    console.log(`Course ${courseTopic} fully completed (Intensity 3) - marking as complete`);
                    if (newCareerStats.courseCompletionStatus.hasOwnProperty(normalizedCourse)) {
                        newCareerStats.courseCompletionStatus[normalizedCourse] = true;
                    } else if (newCareerStats.courseCompletionStatus.hasOwnProperty(courseTopic.toLowerCase())) {
                        newCareerStats.courseCompletionStatus[courseTopic.toLowerCase()] = true;
                    }
                } else {
                    console.log(`Course ${courseTopic} session completed but not fully finished (not Intensity 3)`);
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

            // Sanitize the data to remove any NaN values before saving
            const sanitizedStats = this.sanitizeDataForFirebase(updatedStats);
            
            // Save to Firebase
            console.log('🔄 CareerStatsService: Saving to Firebase...');
            await statsRef.set(sanitizedStats);
            console.log('✅ CareerStatsService: Career stats updated successfully!');
            console.log('📊 CareerStatsService: Final stats:', sanitizedStats);
            
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
