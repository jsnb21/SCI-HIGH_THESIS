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

// Export a singleton instance
const gameManager = new GameManager();
export default gameManager;