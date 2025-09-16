// Authentication Service for SCI-HIGH Game
// Handles three types of users: Professor, Student, and General User

class AuthService {
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
        this.auth = null;
        this.database = null; // Changed from firestore to database
        this.currentUser = null;
        this.userType = null;
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
            console.log('Starting Firebase initialization for Auth Service...');
            
            // Check if Firebase is already loaded
            if (typeof window.firebase === 'undefined') {
                await this.loadFirebaseScripts();
            }
            
            // Initialize Firebase if not already done
            if (!window.firebase.apps.length) {
                window.firebase.initializeApp(this.firebaseConfig);
            }
            
            this.auth = window.firebase.auth();
            this.database = window.firebase.database(); // Changed from firestore to database
            
            // Set up auth state listener
            this.auth.onAuthStateChanged((user) => {
                if (user) {
                    this.loadUserProfile(user);
                } else {
                    this.currentUser = null;
                    this.userType = null;
                }
            });
            
            this.isFirebaseInitialized = true;
            console.log('Firebase Auth Service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Firebase Auth Service:', error);
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
                'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js',
                'https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js' // Changed from firestore to database
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

    // Ensure user is authenticated (anonymous auth for students)
    async ensureAuthenticated() {
        return new Promise(async (resolve, reject) => {
            try {
                // If already authenticated, resolve immediately
                if (this.auth.currentUser) {
                    console.log('AuthService: Already authenticated with user:', this.auth.currentUser.uid);
                    resolve();
                    return;
                }

                // Set up a one-time auth state listener
                const unsubscribe = this.auth.onAuthStateChanged(async (user) => {
                    if (user) {
                        console.log('AuthService: Auth state changed - user authenticated:', user.uid);
                        unsubscribe(); // Remove listener
                        resolve();
                    }
                });

                // Start anonymous authentication
                console.log('AuthService: Starting anonymous authentication...');
                await this.auth.signInAnonymously();
                
                // If auth state doesn't change within 3 seconds, resolve anyway
                setTimeout(() => {
                    if (this.auth.currentUser) {
                        console.log('AuthService: Authentication timeout reached but user exists');
                        unsubscribe();
                        resolve();
                    } else {
                        console.error('AuthService: Authentication timeout - no user found');
                        unsubscribe();
                        reject(new Error('Authentication timeout'));
                    }
                }, 3000);

            } catch (error) {
                console.error('AuthService: Authentication error:', error);
                reject(error);
            }
        });
    }

    // Ensure user is authenticated (anonymous auth for students)
    async ensureAuthenticated() {
        return new Promise(async (resolve, reject) => {
            try {
                // If already authenticated, resolve immediately
                if (this.auth.currentUser) {
                    console.log('AuthService: Already authenticated with user:', this.auth.currentUser.uid);
                    resolve();
                    return;
                }

                // Set up a one-time auth state listener
                const unsubscribe = this.auth.onAuthStateChanged(async (user) => {
                    if (user) {
                        console.log('AuthService: Auth state changed - user authenticated:', user.uid);
                        unsubscribe(); // Remove listener
                        resolve();
                    }
                });

                // Start anonymous authentication
                console.log('AuthService: Starting anonymous authentication...');
                await this.auth.signInAnonymously();
                
                // If auth state doesn't change within 3 seconds, resolve anyway
                setTimeout(() => {
                    if (this.auth.currentUser) {
                        console.log('AuthService: Authentication timeout reached but user exists');
                        unsubscribe();
                        resolve();
                    } else {
                        console.error('AuthService: Authentication timeout - no user found');
                        unsubscribe();
                        reject(new Error('Authentication timeout'));
                    }
                }, 3000);

            } catch (error) {
                console.error('AuthService: Authentication error:', error);
                reject(error);
            }
        });
    }

    async loadUserProfile(firebaseUser) {
        try {
            // For anonymous users (students), we don't need to load profile from professors/general collections
            if (firebaseUser.isAnonymous) {
                console.log('AuthService: Anonymous user authenticated, skipping profile load');
                return;
            }

            // Try to find user in professors collection first using Realtime Database
            const professorSnapshot = await this.database.ref('professors').child(firebaseUser.uid).once('value');
            if (professorSnapshot.exists()) {
                const professorData = professorSnapshot.val();
                this.currentUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    type: 'professor',
                    profile: professorData
                };
                this.userType = 'professor';
                return;
            }

            // Try general users collection
            const generalSnapshot = await this.database.ref('general_users').child(firebaseUser.uid).once('value');
            if (generalSnapshot.exists()) {
                const generalData = generalSnapshot.val();
                this.currentUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    type: 'general',
                    profile: generalData
                };
                this.userType = 'general';
                return;
            }

            // If not found in either, user might be incomplete
            console.warn('User authenticated but profile not found');
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    // Professor Authentication Methods
    async loginProfessor(email, password) {
        const isInitialized = await this.ensureFirebaseInitialized();
        if (!isInitialized) {
            throw new Error('Firebase not available');
        }

        try {
            console.log('AuthService: Attempting professor login with email:', email);
            
            // Validate input
            if (!email || !password) {
                throw new Error('Email and password are required');
            }

            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('AuthService: Firebase auth successful, verifying professor status...');
            
            // Check if professor exists in Realtime Database (updated to use realtime DB)
            const professorSnapshot = await this.database.ref('professors').child(user.uid).once('value');
            if (!professorSnapshot.exists()) {
                await this.auth.signOut();
                throw new Error('Not registered as a professor. Contact system administrator.');
            }

            const professorData = professorSnapshot.val();
            if (!professorData.isVerified) {
                await this.auth.signOut();
                throw new Error('Account pending verification. Contact system administrator.');
            }

            // Update last login timestamp
            await this.database.ref('professors').child(user.uid).update({
                lastLogin: new Date().toISOString()
            });

            this.currentUser = {
                uid: user.uid,
                email: user.email,
                type: 'professor',
                profile: professorData
            };
            this.userType = 'professor';
            
            this.saveUserSession();
            return { success: true, user: this.currentUser };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async registerProfessor(professorData) {
        const isInitialized = await this.ensureFirebaseInitialized();
        if (!isInitialized) {
            throw new Error('Firebase not available');
        }

        try {
            const { fullName, email, institution, password } = professorData;
            
            // Create Firebase user
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Save professor profile to Realtime Database
            await this.database.ref('professors').child(user.uid).set({
                fullName,
                email,
                institution,
                createdAt: new Date().toISOString(),
                isVerified: false, // Requires manual verification
                classes: [],
                totalStudents: 0
            });

            // Sign out immediately since account needs verification
            await this.auth.signOut();

            return { 
                success: true, 
                message: 'Account created successfully! Please wait for administrator verification before logging in.' 
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Student Authentication Methods
    async loginStudent(studentId, password = null) {
        const isInitialized = await this.ensureFirebaseInitialized();
        if (!isInitialized) {
            console.log('AuthService: Firebase not available, using offline mode');
            // Fallback to local storage for offline mode
            return this.loginStudentOffline(studentId);
        }

        try {
            console.log('AuthService: Attempting to login student with ID:', studentId);
            
            // Validate student ID
            if (!studentId || typeof studentId !== 'string' || studentId.trim() === '') {
                throw new Error('Invalid student ID provided');
            }

            // First, ensure we have authentication
            console.log('AuthService: Ensuring authentication...');
            await this.ensureAuthenticated();

            // Query student by student ID using Realtime Database
            console.log('AuthService: Querying Realtime Database for student...');
            const studentsRef = this.database.ref('students');
            const studentQuery = await studentsRef.orderByChild('studentId').equalTo(studentId.trim()).once('value');
            const studentsData = studentQuery.val();

            console.log('AuthService: Query completed - data:', studentsData);

            if (!studentsData) {
                console.log('AuthService: Student not found, creating new account');
                // Student doesn't exist, create a new account
                const newStudent = await this.createStudentAccount(studentId.trim());
                if (newStudent.success) {
                    console.log('AuthService: New student account created successfully');
                    this.currentUser = {
                        uid: newStudent.docId,
                        studentId: studentId.trim(),
                        type: 'student',
                        profile: newStudent.studentData
                    };
                    this.userType = 'student';
                    this.saveUserSession();
                    return { success: true, user: this.currentUser, isNewAccount: true };
                } else {
                    console.error('AuthService: Failed to create new student account:', newStudent.error);
                    throw new Error(newStudent.error);
                }
            }

            console.log('AuthService: Found existing student, loading data...');
            
            // Get the first (and should be only) student record
            const studentKey = Object.keys(studentsData)[0];
            const studentData = studentsData[studentKey];

            if (!studentData) {
                throw new Error('Student data is corrupted or inaccessible');
            }

            console.log('AuthService: Student data loaded successfully for:', studentData.studentId);

            // No password verification needed - just student ID
            
            // Check if account is active
            if (!studentData.isActive) {
                throw new Error('Account is inactive. Please contact your professor.');
            }

            this.currentUser = {
                uid: studentKey,
                studentId: studentData.studentId,
                type: 'student',
                profile: studentData
            };
            this.userType = 'student';

            // Update last login
            console.log('AuthService: Updating last login timestamp...');
            try {
                await studentsRef.child(studentKey).update({
                    lastLogin: new Date().toISOString()
                });
                console.log('AuthService: Last login timestamp updated');
            } catch (updateError) {
                console.warn('AuthService: Failed to update last login timestamp:', updateError);
                // Don't fail login just because timestamp update failed
            }

            this.saveUserSession();
            console.log('AuthService: Student login successful');
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('AuthService: Student login error:', error);
            console.error('AuthService: Error stack:', error.stack);
            
            // If Firebase is having issues, fallback to offline mode
            if (error.message.includes('permission-denied') || 
                error.message.includes('unavailable') || 
                error.message.includes('network')) {
                console.log('AuthService: Firebase error detected, falling back to offline mode');
                return this.loginStudentOffline(studentId);
            }
            
            return { success: false, error: error.message };
        }
    }

    loginStudentOffline(studentId) {
        // Fallback for offline mode
        const offlineStudents = JSON.parse(localStorage.getItem('sci_high_offline_students') || '[]');
        const student = offlineStudents.find(s => s.studentId === studentId);
        
        if (!student) {
            // Create new offline student if not found
            const newOfflineStudent = this.createOfflineStudent(studentId);
            const updatedStudents = [...offlineStudents, newOfflineStudent];
            localStorage.setItem('sci_high_offline_students', JSON.stringify(updatedStudents));
            
            this.currentUser = {
                uid: 'offline_' + studentId,
                studentId: newOfflineStudent.studentId,
                type: 'student',
                profile: newOfflineStudent
            };
            this.userType = 'student';
            this.saveUserSession();
            
            return { success: true, user: this.currentUser, isNewAccount: true };
        }

        this.currentUser = {
            uid: 'offline_' + studentId,
            studentId: student.studentId,
            type: 'student',
            profile: student
        };
        this.userType = 'student';
        this.saveUserSession();
        
        return { success: true, user: this.currentUser };
    }

    // Create a new student account automatically
    async createStudentAccount(studentId) {
        try {
            console.log('AuthService: Creating new student account for ID:', studentId);
            
            // Enhanced duplicate checking before creating account
            console.log('AuthService: Performing duplicate check...');
            
            // Check 1: Query by studentId in main students database
            const studentsRef = this.database.ref('students');
            const existingByIdQuery = await studentsRef.orderByChild('studentId').equalTo(studentId).once('value');
            
            if (existingByIdQuery.exists()) {
                console.log('AuthService: Student already exists with ID:', studentId);
                const existingData = Object.values(existingByIdQuery.val())[0];
                throw new Error(`Student account already exists for ID: ${studentId}. Student name: ${existingData.fullName || existingData.name || 'Unknown'}. Please try logging in instead.`);
            }
            
            // Check 2: Check if student exists with this studentId as key
            const directStudentRef = this.database.ref('students').child(studentId);
            const directSnapshot = await directStudentRef.once('value');
            
            if (directSnapshot.exists()) {
                console.log('AuthService: Student exists with studentId as key:', studentId);
                const existingData = directSnapshot.val();
                throw new Error(`Student account already exists for ID: ${studentId}. Student name: ${existingData.fullName || existingData.name || 'Unknown'}. Please try logging in instead.`);
            }
            
            // Check 3: Check career stats for existing game progress
            const careerStatsRef = this.database.ref('student_career_stats').child(studentId);
            const careerSnapshot = await careerStatsRef.once('value');
            
            if (careerSnapshot.exists()) {
                const careerData = careerSnapshot.val();
                const studentName = careerData.studentInfo?.fullName || 'Unknown';
                console.log('AuthService: Found existing career stats for student:', studentId, studentName);
                console.warn('AuthService: Career stats exist but no main record - possible data inconsistency');
            }
            
            console.log('AuthService: No duplicates found, proceeding with account creation...');
            
            const studentData = {
                studentId,
                fullName: `Student ${studentId}`, // Default name, can be updated later  
                level: 'unknown', // Will be set by student or administrator later
                course: '',
                strand: '',
                year: '',
                academicInfo: {
                    level: 'unknown',
                    course: null,
                    yearLevel: null,
                    strand: null
                },
                accountStatus: {
                    isActive: true,
                    isFirstLogin: true,
                    createdBy: 'auto-created',
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                },
                progress: {
                    completedQuizzes: [],
                    completedStories: [],
                    totalScore: 0,
                    lastActivity: new Date().toISOString(),
                    gameData: {
                        currentLevel: 1,
                        totalPoints: 0,
                        achievements: [],
                        courseProgress: {}
                    }
                },
                gameData: {
                    totalPoints: 0,
                    achievements: [],
                    currentLevel: 1,
                    courseProgress: {
                        'Web_Design': { unlocked: true, completed: false, progress: 0 },
                        'Python': { unlocked: true, completed: false, progress: 0 },
                        'Java': { unlocked: false, completed: false, progress: 0 },
                        'C': { unlocked: false, completed: false, progress: 0 },
                        'CPlusPlus': { unlocked: false, completed: false, progress: 0 },
                        'CSharp': { unlocked: false, completed: false, progress: 0 }
                    }
                },
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                isActive: true,
                createdBy: 'auto-created',
                needsProfileCompletion: true, // Flag to show profile completion modal
                accountType: 'student'
            };

            // Use studentId as the key for consistency and easier lookups
            const studentRef = this.database.ref('students').child(studentId);
            await studentRef.set(studentData);
            
            console.log('AuthService: Student account created successfully with key:', studentId);
            
            return { 
                success: true, 
                docId: studentId, // Return studentId as the document ID
                studentData: studentData
            };
        } catch (error) {
            console.error('AuthService: Error creating student account:', error);
            return { 
                success: false, 
                error: 'Failed to create student account: ' + error.message 
            };
        }
    }

    // Create offline student for local storage
    createOfflineStudent(studentId) {
        return {
            studentId,
            fullName: `Student ${studentId}`,
            academicInfo: {
                level: 'unknown',
                course: null,
                yearLevel: null,
                strand: null
            },
            accountStatus: {
                isActive: true,
                isFirstLogin: true,
                createdBy: 'auto-created-offline',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            },
            gameData: {
                totalPoints: 0,
                achievements: [],
                courseProgress: {
                    'Web_Design': { unlocked: true, completed: false, progress: 0 },
                    'Python': { unlocked: true, completed: false, progress: 0 },
                    'Java': { unlocked: false, completed: false, progress: 0 },
                    'C': { unlocked: false, completed: false, progress: 0 },
                    'CPlusPlus': { unlocked: false, completed: false, progress: 0 },
                    'CSharp': { unlocked: false, completed: false, progress: 0 }
                }
            }
        };
    }

    // General User Authentication Methods
    async loginGeneral(email, password) {
        const isInitialized = await this.ensureFirebaseInitialized();
        if (!isInitialized) {
            throw new Error('Firebase not available');
        }

        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Get user profile
            const userDoc = await this.firestore.collection('general_users').doc(user.uid).get();
            if (!userDoc.exists) {
                await this.auth.signOut();
                throw new Error('User profile not found');
            }

            const userData = userDoc.data();
            this.currentUser = {
                uid: user.uid,
                email: user.email,
                type: 'general',
                profile: userData
            };
            this.userType = 'general';
            
            // Update last login
            await this.firestore.collection('general_users').doc(user.uid).update({
                lastLogin: new Date().toISOString()
            });

            this.saveUserSession();
            return { success: true, user: this.currentUser };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async registerGeneral(userData) {
        const isInitialized = await this.ensureFirebaseInitialized();
        if (!isInitialized) {
            throw new Error('Firebase not available');
        }

        try {
            const { fullName, email, displayName, password } = userData;
            
            // Create Firebase user
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Save user profile
            await this.firestore.collection('general_users').doc(user.uid).set({
                fullName,
                email,
                displayName,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                gameData: {
                    totalPoints: 0,
                    achievements: [],
                    courseProgress: {
                        'Web_Design': { unlocked: true, completed: false, progress: 0 },
                        'Python': { unlocked: true, completed: false, progress: 0 },
                        'Java': { unlocked: false, completed: false, progress: 0 },
                        'C': { unlocked: false, completed: false, progress: 0 },
                        'CPlusPlus': { unlocked: false, completed: false, progress: 0 },
                        'CSharp': { unlocked: false, completed: false, progress: 0 }
                    }
                }
            });

            // Auto-login after registration
            await this.loadUserProfile(user);
            this.saveUserSession();

            return { success: true, user: this.currentUser };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Guest Session Methods
    createGuestSession() {
        const guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.currentUser = {
            uid: guestId,
            type: 'guest',
            profile: {
                displayName: 'Guest Player',
                isGuest: true,
                gameData: {
                    totalPoints: 0,
                    achievements: [],
                    courseProgress: {
                        'Web_Design': { unlocked: true, completed: false, progress: 0 },
                        'Python': { unlocked: true, completed: false, progress: 0 },
                        'Java': { unlocked: false, completed: false, progress: 0 },
                        'C': { unlocked: false, completed: false, progress: 0 },
                        'CPlusPlus': { unlocked: false, completed: false, progress: 0 },
                        'CSharp': { unlocked: false, completed: false, progress: 0 }
                    }
                }
            }
        };
        this.userType = 'guest';
        this.saveUserSession();
        return this.currentUser;
    }

    // Session Management
    saveUserSession() {
        localStorage.setItem('sci_high_user', JSON.stringify(this.currentUser));
        localStorage.setItem('sci_high_user_type', this.userType);
        
        // Trigger save data sync after successful login (async, don't block)
        this.syncSaveDataAfterLogin();
    }
    
    async syncSaveDataAfterLogin() {
        try {
            // Dynamic import to avoid circular dependencies
            const { syncSaveDataOnLogin } = await import('../save.js');
            await syncSaveDataOnLogin();
            console.log('AuthService: Save data synced after login');
        } catch (error) {
            console.warn('AuthService: Failed to sync save data after login:', error);
        }
    }

    loadUserSession() {
        try {
            const savedUser = localStorage.getItem('sci_high_user');
            const savedUserType = localStorage.getItem('sci_high_user_type');
            
            if (savedUser && savedUserType) {
                this.currentUser = JSON.parse(savedUser);
                this.userType = savedUserType;
                return true;
            }
        } catch (error) {
            console.error('Error loading user session:', error);
        }
        return false;
    }

    // Utility Methods
    isAuthenticated() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getUserType() {
        return this.userType;
    }

    async logout() {
        try {
            if (this.userType !== 'guest' && this.isFirebaseInitialized) {
                await this.auth.signOut();
            }
        } catch (error) {
            console.error('Error signing out:', error);
        }
        
        this.currentUser = null;
        this.userType = null;
        localStorage.removeItem('sci_high_user');
        localStorage.removeItem('sci_high_user_type');
    }

    // Professor-specific methods
    async createStudent(studentData) {
        if (this.userType !== 'professor') {
            throw new Error('Only professors can create student accounts');
        }

        const isInitialized = await this.ensureFirebaseInitialized();
        if (!isInitialized) {
            throw new Error('Firebase not available');
        }

        try {
            const { studentId, fullName, course, yearLevel, strand, academicLevel } = studentData;
            
            // Generate temporary password
            const tempPassword = this.generateStudentPassword();
            
            // Create student document
            const studentDoc = {
                studentId,
                fullName,
                password: tempPassword, // In production, hash this
                academicInfo: {
                    level: academicLevel,
                    course: academicLevel === 'college' ? course : null,
                    yearLevel,
                    strand: academicLevel === 'shs' ? strand : null
                },
                accountStatus: {
                    isActive: true,
                    isFirstLogin: true,
                    createdBy: this.currentUser.uid,
                    createdAt: new Date().toISOString()
                },
                gameData: {
                    totalPoints: 0,
                    achievements: [],
                    courseProgress: {
                        'Web_Design': { unlocked: true, completed: false, progress: 0 },
                        'Python': { unlocked: true, completed: false, progress: 0 },
                        'Java': { unlocked: false, completed: false, progress: 0 },
                        'C': { unlocked: false, completed: false, progress: 0 },
                        'CPlusPlus': { unlocked: false, completed: false, progress: 0 },
                        'CSharp': { unlocked: false, completed: false, progress: 0 }
                    }
                }
            };

            // Save to Firestore
            await this.firestore.collection('students').add(studentDoc);
            
            return { 
                success: true, 
                studentId, 
                temporaryPassword: tempPassword,
                message: 'Student account created successfully' 
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    generateStudentPassword() {
        const prefix = "SCI2024";
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${prefix}${random}`;
    }

    // Initialize service
    async initialize() {
        // Load existing session
        this.loadUserSession();
        
        // Initialize Firebase
        await this.ensureFirebaseInitialized();
    }
}

// Export singleton instance
const authService = new AuthService();
export default authService;
