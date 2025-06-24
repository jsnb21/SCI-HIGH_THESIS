// Global Game Manager Singleton

class GameManager {    constructor() {
        this.playerHP = 100; // Changed from 3 to 100 to match quiz system
        this.playTime = 0;
        this.gameProgress = 0;

        this.previousScene = 'MainMenu'; // default scene
        
        // Course progression system
        this.courseProgress = {
            'Web_Design': { unlocked: true, completed: false, progress: 0 },
            'Python': { unlocked: true, completed: false, progress: 0 },
            'Java': { unlocked: false, completed: false, progress: 0 },
            'C': { unlocked: false, completed: false, progress: 0 },
            'C++': { unlocked: false, completed: false, progress: 0 },
            'C#': { unlocked: false, completed: false, progress: 0 }
        };
    }

    // Player HP
    setPlayerHP(hp) {
        this.playerHP = hp;
    }
    getPlayerHP() {
        return this.playerHP;
    }

    // Play Time
    addPlayTime(seconds) {
        this.playTime += seconds;
    }
    setPlayTime(seconds) {
        this.playTime = seconds;
    }
    getPlayTime() {
        return this.playTime;
    }

    // Game Progress
    setGameProgress(progress) {
        this.gameProgress = progress;
    }
    getGameProgress() {
        return this.gameProgress;
    }

    // Previous Scene
    setPreviousScene(sceneKey) {
        this.previousScene = sceneKey;
    }

    getPreviousScene() {
        return this.previousScene;
    }    // Reset all values
    reset() {
        this.playerHP = 100; // Changed from 3 to 100 to match quiz system
        this.playTime = 0;
        this.gameProgress = 0;
        this.previousScene = 'MainMenu';
        
        // Reset course progress
        this.courseProgress = {
            'Web_Design': { unlocked: true, completed: false, progress: 0 },
            'Python': { unlocked: true, completed: false, progress: 0 },
            'Java': { unlocked: false, completed: false, progress: 0 },
            'C': { unlocked: false, completed: false, progress: 0 },
            'C++': { unlocked: false, completed: false, progress: 0 },
            'C#': { unlocked: false, completed: false, progress: 0 }
        };
    }

    // Course Progress Management
    getCourseProgress(courseKey) {
        return this.courseProgress[courseKey] || { unlocked: false, completed: false, progress: 0 };
    }
    
    isCourseUnlocked(courseKey) {
        return this.courseProgress[courseKey]?.unlocked || false;
    }
    
    setCourseProgress(courseKey, progress) {
        if (this.courseProgress[courseKey]) {
            this.courseProgress[courseKey].progress = progress;
            
            // Mark as completed if progress reaches 100%
            if (progress >= 100) {
                this.courseProgress[courseKey].completed = true;
                this.checkForUnlocks();
            }
        }
    }
    
    setCourseCompleted(courseKey, completed = true) {
        if (this.courseProgress[courseKey]) {
            this.courseProgress[courseKey].completed = completed;
            if (completed) {
                this.courseProgress[courseKey].progress = 100;
                this.checkForUnlocks();
            }
        }
    }
    
    checkForUnlocks() {
        const webDesignCompleted = this.courseProgress['Web_Design'].completed;
        const pythonCompleted = this.courseProgress['Python'].completed;
        
        // Unlock Java when Web Design is completed
        if (webDesignCompleted && !this.courseProgress['Java'].unlocked) {
            this.courseProgress['Java'].unlocked = true;
        }
        
        // Unlock C when Python is completed
        if (pythonCompleted && !this.courseProgress['C'].unlocked) {
            this.courseProgress['C'].unlocked = true;
        }
        
        // Unlock C++ when both Web Design and Python are completed
        if (webDesignCompleted && pythonCompleted && !this.courseProgress['C++'].unlocked) {
            this.courseProgress['C++'].unlocked = true;
        }
        
        // Unlock C# when Java and C are completed
        if (this.courseProgress['Java'].completed && this.courseProgress['C'].completed && !this.courseProgress['C#'].unlocked) {
            this.courseProgress['C#'].unlocked = true;
        }
    }
    
    // Debug/Testing methods
    unlockAllCourses() {
        Object.keys(this.courseProgress).forEach(key => {
            this.courseProgress[key].unlocked = true;
        });
    }
      resetCourseProgress() {
        this.courseProgress = {
            'Web_Design': { unlocked: true, completed: false, progress: 0 },
            'Python': { unlocked: true, completed: false, progress: 0 },
            'Java': { unlocked: false, completed: false, progress: 0 },
            'C': { unlocked: false, completed: false, progress: 0 },
            'C++': { unlocked: false, completed: false, progress: 0 },
            'C#': { unlocked: false, completed: false, progress: 0 }
        };
    }
}

class Character {
    constructor() {
        this.quest1 = 0;
        this.quest1Desc = "";
        this.quest2 = 0;
        this.quest2Desc = "";
        this.quest3 = 0;
        this.quest3Desc = "";
    }
}

class OnceOnlyFlags {
    constructor() {
        this.flags = {};
    }

    hasSeen(key) {
        return !!this.flags[key];
    }

    setSeen(key) {
        this.flags[key] = true;
    }

    reset() {
        this.flags = {};
    }
}

const char1 = new Character();
const char2 = new Character();
const char3 = new Character();
const char4 = new Character();
const char5 = new Character();
const onceOnlyFlags = new OnceOnlyFlags();

// Export singleton instance
const gameManager = new GameManager();

// Browser Console Testing
window.char1 = char1;
window.char2 = char2;
window.char3 = char3;
window.char4 = char4;
window.char5 = char5;
window.gameManager = gameManager; // Expose gameManager for testing

export default gameManager;
export { char1, char2, char3, char4, char5, onceOnlyFlags };
