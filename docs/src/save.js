import gameManager, { char1, char2, char3, char4, char5 } from './gameManager.js';

// Firebase save service
class SaveService {
    constructor() {
        this.firestore = null;
        this.isFirebaseAvailable = false;
        this.initFirebase();
    }

    async initFirebase() {
        try {
            // Check if Firebase is available (it should be initialized by authService)
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                this.firestore = window.firebase.firestore();
                this.isFirebaseAvailable = true;
                console.log('SaveService: Firebase Firestore initialized');
            } else {
                console.warn('SaveService: Firebase not available, using localStorage only');
            }
        } catch (error) {
            console.error('SaveService: Firebase initialization failed:', error);
            this.isFirebaseAvailable = false;
        }
    }

    async ensureFirebaseReady() {
        if (!this.isFirebaseAvailable && typeof window !== 'undefined' && window.firebase) {
            await this.initFirebase();
        }
        return this.isFirebaseAvailable;
    }
}

const saveService = new SaveService();

// Get current user data for Firebase operations
function getCurrentUserData() {
    const userData = localStorage.getItem('sci_high_user');
    const userType = localStorage.getItem('sci_high_user_type');
    
    if (!userData || !userType) {
        return null;
    }
    
    try {
        const user = JSON.parse(userData);
        return {
            user,
            userType,
            userId: getUserId(user, userType)
        };
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}

// Get user ID based on user type and sanitize for Firebase
function getUserId(user, userType) {
    let rawId;
    if (userType === 'student') {
        rawId = user.studentId || user.id || 'unknown_student';
    } else if (userType === 'teacher') {
        rawId = user.teacherId || user.id || 'unknown_teacher';  
    } else if (userType === 'admin') {
        rawId = user.adminId || user.id || 'unknown_admin';
    } else {
        rawId = 'unknown_user';
    }
    
    // Sanitize Firebase document ID - replace invalid characters
    // Firebase doesn't allow: . # $ / [ ] 
    // Replace dashes with underscores to be safe
    return rawId.replace(/[.#$\/\[\]]/g, '_').replace(/-/g, '_');
}

// Get current user identifier for save system (localStorage key)
function getCurrentUserSaveKey() {
    const userData = localStorage.getItem('sci_high_user');
    const userType = localStorage.getItem('sci_high_user_type');
    
    if (!userData || !userType) {
        console.warn('No authenticated user found, using default save');
        return 'sciHighSave_default';
    }
    
    try {
        const user = JSON.parse(userData);
        let userIdentifier;
        
        if (userType === 'student') {
            userIdentifier = user.studentId || user.id || 'unknown_student';
        } else if (userType === 'teacher') {
            userIdentifier = user.teacherId || user.id || 'unknown_teacher';
        } else if (userType === 'admin') {
            userIdentifier = user.adminId || user.id || 'unknown_admin';
        } else {
            userIdentifier = 'unknown_user';
        }
        
        return `sciHighSave_${userType}_${userIdentifier}`;
    } catch (error) {
        console.error('Error parsing user data for save key:', error);
        return 'sciHighSave_default';
    }
}

// Save function - saves to both Firebase and localStorage
async function saveGame() {
    const saveKey = getCurrentUserSaveKey();
    const userData = getCurrentUserData();
    
    const saveData = {
        playerHP: gameManager.getPlayerHP(),
        playTime: gameManager.getPlayTime(),
        gameProgress: gameManager.getGameProgress(),
        courseProgress: gameManager.courseProgress,
        characters: [
            { ...char1 },
            { ...char2 },
            { ...char3 },
            { ...char4 },
            { ...char5 }
        ],
        lastSaved: new Date().toISOString(),
        version: '1.0'
    };

    // Always save to localStorage first (immediate backup)
    try {
        localStorage.setItem(saveKey, JSON.stringify(saveData));
        console.log('SaveService: Game saved to localStorage');
    } catch (error) {
        console.error('SaveService: Failed to save to localStorage:', error);
    }

    // Save to Firebase if available and user is authenticated
    if (userData && await saveService.ensureFirebaseReady()) {
        try {
            const docRef = saveService.firestore
                .collection('users')
                .doc(`${userData.userType}_${userData.userId}`)
                .collection('gameData')
                .doc('saveData');

            await docRef.set(saveData);
            console.log('SaveService: Game saved to Firebase');
        } catch (error) {
            console.error('SaveService: Failed to save to Firebase:', error);
            // Firebase save failed, but localStorage save succeeded, so continue
        }
    }
}

// Check if current user has existing save data (checks both Firebase and localStorage)
async function hasExistingSave() {
    const userData = getCurrentUserData();
    
    // Check Firebase first if available
    if (userData && await saveService.ensureFirebaseReady()) {
        try {
            const docRef = saveService.firestore
                .collection('users')
                .doc(`${userData.userType}_${userData.userId}`)
                .collection('gameData')
                .doc('saveData');
                
            const doc = await docRef.get();
            if (doc.exists) {
                console.log('SaveService: Found save data in Firebase');
                return true;
            }
        } catch (error) {
            console.error('SaveService: Error checking Firebase save:', error);
        }
    }
    
    // Fall back to localStorage check
    const saveKey = getCurrentUserSaveKey();
    const hasLocal = localStorage.getItem(saveKey) !== null;
    if (hasLocal) {
        console.log('SaveService: Found save data in localStorage');
    }
    return hasLocal;
}

// Load function - loads from Firebase first, falls back to localStorage
async function loadGame() {
    const userData = getCurrentUserData();
    let saveData = null;
    
    // Try to load from Firebase first if available
    if (userData && await saveService.ensureFirebaseReady()) {
        try {
            const docRef = saveService.firestore
                .collection('users')
                .doc(`${userData.userType}_${userData.userId}`)
                .collection('gameData')
                .doc('saveData');
                
            const doc = await docRef.get();
            if (doc.exists) {
                saveData = doc.data();
                console.log('SaveService: Loaded save data from Firebase');
                
                // Update localStorage with Firebase data (sync)
                const saveKey = getCurrentUserSaveKey();
                localStorage.setItem(saveKey, JSON.stringify(saveData));
            }
        } catch (error) {
            console.error('SaveService: Failed to load from Firebase:', error);
        }
    }
    
    // Fall back to localStorage if Firebase failed or unavailable
    if (!saveData) {
        const saveKey = getCurrentUserSaveKey();
        const saveStr = localStorage.getItem(saveKey);
        if (saveStr) {
            try {
                saveData = JSON.parse(saveStr);
                console.log('SaveService: Loaded save data from localStorage');
            } catch (e) {
                console.error('SaveService: Error parsing localStorage save data:', e);
                return null;
            }
        }
    }
    
    return saveData;
}

// Clear current user's save data (for new game) - removes from both Firebase and localStorage
async function clearCurrentUserSave() {
    const saveKey = getCurrentUserSaveKey();
    const userData = getCurrentUserData();
    
    // Remove from localStorage
    localStorage.removeItem(saveKey);
    console.log('SaveService: Save data cleared from localStorage');
    
    // Remove from Firebase if available
    if (userData && await saveService.ensureFirebaseReady()) {
        try {
            const docRef = saveService.firestore
                .collection('users')
                .doc(`${userData.userType}_${userData.userId}`)
                .collection('gameData')
                .doc('saveData');
                
            await docRef.delete();
            console.log('SaveService: Save data cleared from Firebase');
        } catch (error) {
            console.error('SaveService: Failed to clear Firebase save data:', error);
        }
    }
}

// Sync save data on login - pull latest from Firebase when user logs in
async function syncSaveDataOnLogin() {
    const userData = getCurrentUserData();
    
    if (!userData || !await saveService.ensureFirebaseReady()) {
        console.log('SaveService: Cannot sync - user not authenticated or Firebase unavailable');
        return false;
    }
    
    try {
        const docRef = saveService.firestore
            .collection('users')
            .doc(`${userData.userType}_${userData.userId}`)
            .collection('gameData')
            .doc('saveData');
            
        const doc = await docRef.get();
        
        if (doc.exists) {
            const firebaseData = doc.data();
            const saveKey = getCurrentUserSaveKey();
            const localDataStr = localStorage.getItem(saveKey);
            
            let shouldUseFirebaseData = true;
            
            // Compare timestamps if both exist
            if (localDataStr) {
                try {
                    const localData = JSON.parse(localDataStr);
                    const firebaseTime = new Date(firebaseData.lastSaved || 0);
                    const localTime = new Date(localData.lastSaved || 0);
                    
                    // Use whichever is more recent
                    if (localTime > firebaseTime) {
                        shouldUseFirebaseData = false;
                        console.log('SaveService: Local data is more recent, uploading to Firebase');
                        // Upload local data to Firebase
                        await docRef.set(localData);
                    }
                } catch (error) {
                    console.error('SaveService: Error comparing save timestamps:', error);
                }
            }
            
            if (shouldUseFirebaseData) {
                localStorage.setItem(saveKey, JSON.stringify(firebaseData));
                console.log('SaveService: Synced Firebase data to localStorage');
            }
            
            return true;
        } else {
            // No Firebase data, check if we have local data to upload
            const saveKey = getCurrentUserSaveKey();
            const localDataStr = localStorage.getItem(saveKey);
            
            if (localDataStr) {
                const localData = JSON.parse(localDataStr);
                await docRef.set(localData);
                console.log('SaveService: Uploaded local save data to Firebase');
                return true;
            }
        }
    } catch (error) {
        console.error('SaveService: Error syncing save data:', error);
    }
    
    return false;
}

// Get all save keys (legacy function, mainly for cleanup)
function getAllSaveKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sciHighSave_')) {
            keys.push(key);
        }
    }
    return keys;
}

// Apply loaded save data to game manager
function applySaveData(saveData) {
    if (!saveData) return false;
    
    gameManager.setPlayerHP(saveData.playerHP || 100);
    gameManager.setPlayTime(saveData.playTime || 0);
    gameManager.setGameProgress(saveData.gameProgress || 0);
    
    // Apply course progress if it exists in save data
    if (saveData.courseProgress) {
        gameManager.courseProgress = { ...saveData.courseProgress };
    }
    
    // Apply character data
    if (saveData.characters && saveData.characters.length >= 5) {
        Object.assign(char1, saveData.characters[0]);
        Object.assign(char2, saveData.characters[1]);
        Object.assign(char3, saveData.characters[2]);
        Object.assign(char4, saveData.characters[3]);
        Object.assign(char5, saveData.characters[4]);
    }
    
    return true;
}

// Save story progress to Firebase with student ID association
async function saveStoryProgress(characterName, progressData) {
    const userData = getCurrentUserData();
    
    if (!userData || userData.userType !== 'student') {
        console.warn('SaveService: Story progress can only be saved for students');
        return false;
    }

    // Prepare story progress data
    const storyProgressData = {
        studentId: userData.user.studentId || userData.user.uid,
        character: characterName,
        progress: progressData,
        lastUpdated: new Date().toISOString(),
        timestamp: new Date().toISOString()
    };

    console.log('Saving story progress:', storyProgressData);

    // Save to localStorage as backup
    try {
        const localKey = `story_progress_${userData.user.studentId || userData.user.uid}_${characterName}`;
        localStorage.setItem(localKey, JSON.stringify(storyProgressData));
        console.log('SaveService: Story progress saved to localStorage');
    } catch (error) {
        console.error('SaveService: Failed to save story progress to localStorage:', error);
    }

    // Save to Firebase if available
    if (await saveService.ensureFirebaseReady()) {
        try {
            // Use Realtime Database (since that's what the auth system uses)
            if (typeof window !== 'undefined' && window.firebase && window.firebase.database) {
                const database = window.firebase.database();
                const progressRef = database.ref('story_progress');
                
                // Create a unique key for this progress entry
                const progressKey = `${userData.user.studentId || userData.user.uid}_${characterName}`;
                
                await progressRef.child(progressKey).set(storyProgressData);
                console.log('SaveService: Story progress saved to Firebase Realtime Database');
                return true;
            } else {
                console.warn('SaveService: Firebase Realtime Database not available');
                return false;
            }
        } catch (error) {
            console.error('SaveService: Failed to save story progress to Firebase:', error);
            return false;
        }
    }

    return false;
}

// Load story progress from Firebase
async function loadStoryProgress(characterName, studentId = null) {
    const userData = getCurrentUserData();
    const targetStudentId = studentId || (userData?.user?.studentId || userData?.user?.uid);
    
    if (!targetStudentId) {
        console.warn('SaveService: No student ID available for loading story progress');
        return null;
    }

    // Try to load from Firebase first
    if (await saveService.ensureFirebaseReady()) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.database) {
                const database = window.firebase.database();
                const progressKey = `${targetStudentId}_${characterName}`;
                const snapshot = await database.ref('story_progress').child(progressKey).once('value');
                
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    console.log('SaveService: Story progress loaded from Firebase:', data);
                    return data.progress;
                }
            }
        } catch (error) {
            console.error('SaveService: Failed to load story progress from Firebase:', error);
        }
    }

    // Fallback to localStorage
    try {
        const localKey = `story_progress_${targetStudentId}_${characterName}`;
        const localData = localStorage.getItem(localKey);
        if (localData) {
            const parsed = JSON.parse(localData);
            console.log('SaveService: Story progress loaded from localStorage:', parsed);
            return parsed.progress;
        }
    } catch (error) {
        console.error('SaveService: Failed to load story progress from localStorage:', error);
    }

    return null;
}

// Get all story progress for a student
async function getAllStoryProgress(studentId = null) {
    const userData = getCurrentUserData();
    const targetStudentId = studentId || (userData?.user?.studentId || userData?.user?.uid);
    
    if (!targetStudentId) {
        console.warn('SaveService: No student ID available for loading all story progress');
        return {};
    }

    const allProgress = {};

    // Try to load from Firebase
    if (await saveService.ensureFirebaseReady()) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.database) {
                const database = window.firebase.database();
                const snapshot = await database.ref('story_progress')
                    .orderByChild('studentId')
                    .equalTo(targetStudentId)
                    .once('value');
                
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    Object.keys(data).forEach(key => {
                        const progress = data[key];
                        allProgress[progress.character] = progress.progress;
                    });
                    console.log('SaveService: All story progress loaded from Firebase:', allProgress);
                    return allProgress;
                }
            }
        } catch (error) {
            console.error('SaveService: Failed to load all story progress from Firebase:', error);
        }
    }

    // Fallback to localStorage
    try {
        const characters = ['noah', 'lily', 'damian']; // Add more as needed
        characters.forEach(character => {
            const localKey = `story_progress_${targetStudentId}_${character}`;
            const localData = localStorage.getItem(localKey);
            if (localData) {
                const parsed = JSON.parse(localData);
                allProgress[character] = parsed.progress;
            }
        });
        console.log('SaveService: All story progress loaded from localStorage:', allProgress);
    } catch (error) {
        console.error('SaveService: Failed to load story progress from localStorage:', error);
    }

    return allProgress;
}

export { saveGame, getAllSaveKeys, loadGame, applySaveData, hasExistingSave, clearCurrentUserSave, getCurrentUserSaveKey, syncSaveDataOnLogin, saveStoryProgress, loadStoryProgress, getAllStoryProgress };