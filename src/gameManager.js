// Global Game Manager Singleton

class GameManager {
    constructor() {
        // Default values
        this.playerHP = 3;
        this.playTime = 0; // in seconds
        this.gameProgress = 0; // e.g., 0 = new game, 1 = after tutorial, etc.
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

    // Reset all values (optional utility)
    reset() {
        this.playerHP = 3;
        this.playTime = 0;
        this.gameProgress = 0;
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

// Browser Console Testing Purposes. Remove once done.
window.char1 = char1;
window.char2 = char2;
window.char3 = char3;
window.char4 = char4;
window.char5 = char5;

// Export a singleton instance
const gameManager = new GameManager();
export default gameManager;
export { char1, char2, char3, char4, char5, onceOnlyFlags };