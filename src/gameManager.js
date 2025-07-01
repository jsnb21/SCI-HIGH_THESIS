// Global Game Manager Singleton

class GameManager {    constructor() {
        this.playerHP = 100; // Changed from 3 to 100 to match quiz system
        this.maxPlayerHP = 100; // Add max HP tracking
        this.playTime = 0;
        this.gameProgress = 0;
        this.permanentDamage = 10; // Add permanent damage tracking
        this.playerBuffs = {}; // Add buff system

        this.previousScene = 'MainMenu'; // default scene
        
        // Point System
        this.totalPoints = 0;
        this.topicPoints = {
            'Web_Design': 0,
            'Python': 0,
            'Java': 0,
            'C': 0,
            'C++': 0,
            'C#': 0
        };
        this.pointsHistory = []; // Track point transactions
        this.achievements = new Set(); // Track earned achievements
        this.pointMultipliers = {
            base: 10, // Base points per correct answer
            combo: 1.5, // Multiplier for combo bonuses
            speed: 1.2, // Multiplier for fast answers
            perfect: 2.0, // Multiplier for perfect quizzes
            difficulty: {
                easy: 1.0,
                medium: 1.5,
                hard: 2.0
            }
        };
        
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

    // =========================
    // POINT SYSTEM METHODS
    // =========================

    // Get total points
    getTotalPoints() {
        return this.totalPoints;
    }

    // Get points for a specific topic
    getTopicPoints(topic) {
        return this.topicPoints[topic] || 0;
    }

    // Add points with optional topic and description
    addPoints(points, topic = null, description = 'Points earned') {
        const roundedPoints = Math.round(points);
        this.totalPoints += roundedPoints;
        
        if (topic && this.topicPoints.hasOwnProperty(topic)) {
            this.topicPoints[topic] += roundedPoints;
        }
        
        // Track transaction in history
        this.pointsHistory.push({
            points: roundedPoints,
            topic: topic,
            description: description,
            timestamp: Date.now(),
            totalAfter: this.totalPoints
        });
        
        console.log(`+${roundedPoints} points: ${description} (Total: ${this.totalPoints})`);
        
        // Check for achievements
        this.checkPointAchievements();
        
        return roundedPoints;
    }

    // Calculate quiz points with all modifiers
    calculateQuizPoints(quizResults) {
        const {
            correctAnswers = 0,
            totalQuestions = 1,
            comboCount = 0,
            averageAnswerTime = 5,
            timePerQuestion = 10,
            topic = null,
            difficulty = 'medium'
        } = quizResults;

        let basePoints = correctAnswers * this.pointMultipliers.base;
        let totalPoints = basePoints;
        let bonusBreakdown = [];

        // Difficulty multiplier
        const difficultyMultiplier = this.pointMultipliers.difficulty[difficulty] || 1.0;
        if (difficultyMultiplier !== 1.0) {
            totalPoints *= difficultyMultiplier;
            bonusBreakdown.push(`Difficulty (${difficulty}): x${difficultyMultiplier}`);
        }

        // Combo bonus
        if (comboCount > 0) {
            const comboBonus = Math.round(comboCount * this.pointMultipliers.base * 0.5);
            totalPoints += comboBonus;
            bonusBreakdown.push(`Combo bonus: +${comboBonus}`);
        }

        // Speed bonus (if answered faster than half the time limit)
        if (averageAnswerTime < timePerQuestion * 0.5) {
            const speedBonus = Math.round(basePoints * (this.pointMultipliers.speed - 1));
            totalPoints += speedBonus;
            bonusBreakdown.push(`Speed bonus: +${speedBonus}`);
        }

        // Perfect quiz bonus
        const isPerfect = correctAnswers === totalQuestions && totalQuestions > 0;
        if (isPerfect) {
            const perfectBonus = Math.round(basePoints * (this.pointMultipliers.perfect - 1));
            totalPoints += perfectBonus;
            bonusBreakdown.push(`Perfect quiz: +${perfectBonus}`);
        }

        // Apply existing buff multipliers
        totalPoints = this.applyScoreMultiplier(totalPoints);

        // Apply buff-based bonuses
        if (isPerfect) {
            totalPoints = this.applyPerfectBonus(totalPoints, true);
        }

        const finalPoints = Math.round(totalPoints);
        
        return {
            basePoints,
            finalPoints,
            bonusBreakdown,
            isPerfect,
            difficulty,
            topic
        };
    }

    // Award points for quiz completion
    awardQuizPoints(quizResults) {
        const pointsData = this.calculateQuizPoints(quizResults);
        const { finalPoints, topic, bonusBreakdown } = pointsData;
        
        let description = `Quiz completed: ${quizResults.correctAnswers}/${quizResults.totalQuestions} correct`;
        if (bonusBreakdown.length > 0) {
            description += ` (${bonusBreakdown.join(', ')})`;
        }
        
        return this.addPoints(finalPoints, topic, description);
    }

    // Check and award point-based achievements
    checkPointAchievements() {
        const points = this.totalPoints;
        const newAchievements = [];

        // Point milestones
        const pointMilestones = [
            { points: 100, id: 'first_century', name: 'First Century', description: 'Earned 100 points' },
            { points: 500, id: 'rising_star', name: 'Rising Star', description: 'Earned 500 points' },
            { points: 1000, id: 'knowledge_collector', name: 'Knowledge Collector', description: 'Earned 1,000 points' },
            { points: 5000, id: 'point_master', name: 'Point Master', description: 'Earned 5,000 points' },
            { points: 10000, id: 'legendary_learner', name: 'Legendary Learner', description: 'Earned 10,000 points' }
        ];

        pointMilestones.forEach(milestone => {
            if (points >= milestone.points && !this.achievements.has(milestone.id)) {
                this.achievements.add(milestone.id);
                newAchievements.push(milestone);
                console.log(`🏆 Achievement Unlocked: ${milestone.name} - ${milestone.description}`);
            }
        });

        // Topic-specific achievements
        Object.entries(this.topicPoints).forEach(([topic, topicPoints]) => {
            const achievementId = `${topic.toLowerCase()}_master`;
            if (topicPoints >= 1000 && !this.achievements.has(achievementId)) {
                this.achievements.add(achievementId);
                newAchievements.push({
                    id: achievementId,
                    name: `${topic} Master`,
                    description: `Earned 1,000 points in ${topic}`
                });
                console.log(`🏆 Achievement Unlocked: ${topic} Master`);
            }
        });

        return newAchievements;
    }

    // Get recent point transactions
    getRecentPointsHistory(limit = 10) {
        return this.pointsHistory
            .slice(-limit)
            .reverse(); // Most recent first
    }

    // Get all achievements
    getAchievements() {
        return Array.from(this.achievements);
    }

    // Check if player has specific achievement
    hasAchievement(achievementId) {
        return this.achievements.has(achievementId);
    }

    // Get points statistics
    getPointsStatistics() {
        const topTopics = Object.entries(this.topicPoints)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);

        return {
            totalPoints: this.totalPoints,
            topicPoints: this.topicPoints,
            topTopics: topTopics,
            achievementCount: this.achievements.size,
            transactionCount: this.pointsHistory.length
        };
    }

    // Reset points (for testing or new game)
    resetPoints() {
        this.totalPoints = 0;
        this.topicPoints = {
            'Web_Design': 0,
            'Python': 0,
            'Java': 0,
            'C': 0,
            'C++': 0,
            'C#': 0
        };
        this.pointsHistory = [];
        this.achievements.clear();
        console.log('Point system reset');
    }

    // =========================
    // EXISTING METHODS (unchanged)
    // =========================

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
    }

    // Reset all values
    reset() {
        this.playerHP = 100; // Changed from 3 to 100 to match quiz system
        this.maxPlayerHP = 100;
        this.permanentDamage = 10;
        this.playerBuffs = {};
        this.playTime = 0;
        this.gameProgress = 0;
        this.previousScene = 'MainMenu';
        
        // Reset point system
        this.resetPoints();
        
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

    // Utility method to create a point display UI element
    createPointsDisplay(scene, x, y, scaleFactor = 1) {
        const container = scene.add.container(x, y);
        
        // Background
        const bg = scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(-80 * scaleFactor, -20 * scaleFactor, 160 * scaleFactor, 40 * scaleFactor, 8 * scaleFactor);
        bg.lineStyle(2 * scaleFactor, 0xffd700, 0.8);
        bg.strokeRoundedRect(-80 * scaleFactor, -20 * scaleFactor, 160 * scaleFactor, 40 * scaleFactor, 8 * scaleFactor);
        
        // Points text
        const pointsText = scene.add.text(0, 0, `Points: ${this.getTotalPoints()}`, {
            fontSize: `${14 * scaleFactor}px`,
            fill: '#ffd700',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        container.add([bg, pointsText]);
        container.setDepth(100);
        
        return {
            container: container,
            pointsText: pointsText,
            update: () => {
                pointsText.setText(`Points: ${this.getTotalPoints()}`);
            }
        };
    }

    // Debug method to test the point system
    debugTestPoints() {
        console.log('=== TESTING POINT SYSTEM ===');
        
        // Test basic point addition
        this.addPoints(50, 'Python', 'Test points');
        console.log(`Total points: ${this.getTotalPoints()}`);
        console.log(`Python points: ${this.getTopicPoints('Python')}`);
        
        // Test quiz completion
        const testQuizResults = {
            correctAnswers: 8,
            totalQuestions: 10,
            comboCount: 5,
            averageAnswerTime: 3.5,
            timePerQuestion: 10,
            topic: 'Python',
            difficulty: 'hard'
        };
        
        const pointsEarned = this.awardQuizPoints(testQuizResults);
        console.log(`Points earned from test quiz: ${pointsEarned}`);
        
        // Test statistics
        const stats = this.getPointsStatistics();
        console.log('Point statistics:', stats);
        
        console.log('=== END TEST ===');
    }

    // Quick test method to add some points for testing
    quickTestPoints() {
        console.log('Adding test points...');
        this.addPoints(150, 'Python', 'Test Python quiz');
        this.addPoints(200, 'Web_Design', 'Test Web Design quiz');
        this.addPoints(75, 'Java', 'Test Java quiz');
        console.log(`Total points: ${this.getTotalPoints()}`);
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
