// Global Game Manager Singleton

class GameManager {    constructor() {
        this.playerHP = 100; // Changed from 3 to 100 to match quiz system
        this.maxPlayerHP = 100; // Add max HP tracking
        this.playTime = 0;
        this.gameProgress = 0;
        this.permanentDamage = 10; // Add permanent damage tracking
        this.playerBuffs = {}; // Add buff system

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

    // Player HP and Health Management
    setPlayerHP(hp) {
        this.playerHP = Math.max(0, Math.min(hp, this.maxPlayerHP));
    }
    
    getPlayerHP() {
        return this.playerHP;
    }
    
    getMaxPlayerHP() {
        return this.maxPlayerHP;
    }
    
    setMaxPlayerHP(maxHP) {
        this.maxPlayerHP = maxHP;
        // Ensure current HP doesn't exceed new max
        if (this.playerHP > this.maxPlayerHP) {
            this.playerHP = this.maxPlayerHP;
        }
    }
    
    healPlayer(amount) {
        this.setPlayerHP(this.playerHP + amount);
        console.log(`Player healed for ${amount}. Current HP: ${this.playerHP}/${this.maxPlayerHP}`);
    }
    
    damagePlayer(amount) {
        // Apply damage reduction if available
        const reduction = this.getPlayerBuff('armor') || 0;
        const actualDamage = Math.max(1, amount - reduction);
        this.setPlayerHP(this.playerHP - actualDamage);
        console.log(`Player took ${actualDamage} damage (${amount} - ${reduction} armor). Current HP: ${this.playerHP}/${this.maxPlayerHP}`);
    }

    // Permanent Damage System
    getPermanentDamage() {
        return this.permanentDamage;
    }
    
    increasePermanentDamage(amount) {
        this.permanentDamage += amount;
        console.log(`Permanent damage increased by ${amount}. New damage: ${this.permanentDamage}`);
    }

    // Buff System
    addPlayerBuff(buffType, value) {
        if (!this.playerBuffs[buffType]) {
            this.playerBuffs[buffType] = 0;
        }
        this.playerBuffs[buffType] += value;
        console.log(`Added ${buffType} buff: +${value} (total: ${this.playerBuffs[buffType]})`);
    }
    
    getPlayerBuff(buffType) {
        return this.playerBuffs[buffType] || 0;
    }
    
    removePlayerBuff(buffType, value = null) {
        if (this.playerBuffs[buffType]) {
            if (value === null) {
                delete this.playerBuffs[buffType];
            } else {
                this.playerBuffs[buffType] = Math.max(0, this.playerBuffs[buffType] - value);
                if (this.playerBuffs[buffType] === 0) {
                    delete this.playerBuffs[buffType];
                }
            }
        }
    }
    
    clearPlayerBuffs() {
        this.playerBuffs = {};
        console.log('All player buffs cleared');
    }
    
    getAllPlayerBuffs() {
        return { ...this.playerBuffs };
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
        this.maxPlayerHP = 100;
        this.permanentDamage = 10;
        this.playerBuffs = {};
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
    
    // Quiz-related buff methods
    applyScoreMultiplier(baseScore) {
        const multiplier = 1 + this.getPlayerBuff('score_multiplier');
        const finalScore = Math.round(baseScore * multiplier);
        console.log(`Score multiplier applied: ${baseScore} * ${multiplier} = ${finalScore}`);
        return finalScore;
    }
    
    applyComboBoost(baseCombo) {
        const boost = this.getPlayerBuff('combo_boost');
        const finalCombo = baseCombo + boost;
        console.log(`Combo boost applied: ${baseCombo} + ${boost} = ${finalCombo}`);
        return finalCombo;
    }
    
    getTimeBonus() {
        return this.getPlayerBuff('time_bonus') || 0;
    }
    
    applyStreakBonus(baseScore, correctStreak) {
        if (correctStreak >= 3 && this.getPlayerBuff('streak_bonus')) {
            const bonus = this.getPlayerBuff('streak_bonus');
            const bonusScore = Math.round(baseScore * bonus);
            console.log(`Streak bonus applied (${correctStreak} streak): +${bonusScore} points`);
            return baseScore + bonusScore;
        }
        return baseScore;
    }
    
    applySpeedBonus(baseScore, answerTime, timeLimit) {
        if (this.getPlayerBuff('speed_bonus') && answerTime < timeLimit * 0.5) {
            const bonus = this.getPlayerBuff('speed_bonus');
            const bonusScore = Math.round(baseScore * bonus);
            console.log(`Speed bonus applied (fast answer): +${bonusScore} points`);
            return baseScore + bonusScore;
        }
        return baseScore;
    }
    
    hasSecondChance() {
        return this.getPlayerBuff('second_chance') > 0;
    }
    
    checkSecondChance() {
        const chance = this.getPlayerBuff('second_chance');
        if (chance > 0 && Math.random() < chance) {
            console.log('Second chance activated! Wrong answer ignored.');
            return true;
        }
        return false;
    }
    
    hasAnswerHint() {
        return this.getPlayerBuff('answer_hint') > 0;
    }
    
    useAnswerHint() {
        if (this.hasAnswerHint()) {
            this.removePlayerBuff('answer_hint', 1);
            console.log('Answer hint used');
            return true;
        }
        return false;
    }
    
    hasDoubleScore() {
        return this.getPlayerBuff('double_score') > 0;
    }
    
    useDoubleScore() {
        if (this.hasDoubleScore()) {
            this.removePlayerBuff('double_score', 1);
            console.log('Double score used');
            return true;
        }
        return false;
    }
    
    applyPerfectBonus(baseScore, isPerfect) {
        if (isPerfect && this.getPlayerBuff('perfect_bonus')) {
            const bonus = this.getPlayerBuff('perfect_bonus');
            const bonusScore = Math.round(baseScore * bonus);
            console.log(`Perfect quiz bonus applied: +${bonusScore} points`);
            return baseScore + bonusScore;
        }
        return baseScore;
    }
    
    applyScholarFocus() {
        if (this.getPlayerBuff('scholar_focus')) {
            const timeBonus = this.getPlayerBuff('scholar_focus');
            const scoreBonus = this.getPlayerBuff('scholar_focus_score') || 0.25;
            console.log(`Scholar's Focus applied: +${timeBonus} time, +${scoreBonus * 100}% score`);
            return { timeBonus, scoreBonus };
        }
        return { timeBonus: 0, scoreBonus: 0 };
    }
    
    // Helper method to calculate total quiz score with all buffs
    calculateQuizScore(baseScore, options = {}) {
        let finalScore = baseScore;
        
        // Apply score multiplier
        finalScore = this.applyScoreMultiplier(finalScore);
        
        // Apply perfect bonus if applicable
        if (options.isPerfect) {
            finalScore = this.applyPerfectBonus(finalScore, true);
        }
        
        // Apply streak bonus if applicable
        if (options.correctStreak >= 3) {
            finalScore = this.applyStreakBonus(finalScore, options.correctStreak);
        }
        
        // Apply speed bonus if applicable
        if (options.answerTime && options.timeLimit) {
            finalScore = this.applySpeedBonus(finalScore, options.answerTime, options.timeLimit);
        }
        
        // Apply double score if available and used
        if (this.hasDoubleScore() && options.useDoubleScore) {
            this.useDoubleScore();
            finalScore *= 2;
            console.log(`Double score applied: final score = ${finalScore}`);
        }
        
        return finalScore;
    }

    // ...existing code...
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
