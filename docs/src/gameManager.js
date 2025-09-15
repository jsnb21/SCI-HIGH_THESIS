// Global Game Manager Singleton
import { saveGame } from './save.js';

class GameManager {
    constructor() {
        this.playerHP = 100; // Changed from 3 to 100 to match quiz system
        this.maxPlayerHP = 100; // Add max HP tracking
        this.playTime = 0;
        this.gameProgress = 0;
        this.permanentDamage = 10; // Add permanent damage tracking
        this.playerBuffs = {}; // Add buff system

        this.previousScene = 'MainMenu'; // default scene
        
        // Track leaderboard dialog elements for cleanup
        this.activeLeaderboardDialog = null;

        // Point System
        this.totalPoints = 0;
        this.topicPoints = {
            'Web_Design': 0,
            'Python': 0,
            'Java': 0,
            'C': 0,
            'CPlusPlus': 0,
            'CSharp': 0
        };
        this.pointsHistory = []; // Track point transactions
        this.achievements = new Set(); // Track earned achievements
        this.suggestLeaderboardSubmission = false; // Flag for leaderboard suggestions
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
            'Java': { unlocked: true, completed: false, progress: 0 },
            'C': { unlocked: false, completed: false, progress: 0 },
            'CPlusPlus': { unlocked: false, completed: false, progress: 0 },
            'CSharp': { unlocked: false, completed: false, progress: 0 }
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
                
                // Suggest leaderboard submission for significant milestones
                if (milestone.points >= 1000) {
                    this.suggestLeaderboardSubmission = true;
                    console.log('💡 Consider submitting your score to the leaderboard!');
                }
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

    // Check if player should be prompted for leaderboard submission
    shouldPromptLeaderboard() {
        const shouldPrompt = this.suggestLeaderboardSubmission;
        this.suggestLeaderboardSubmission = false; // Reset flag
        return shouldPrompt;
    }

    // Set leaderboard suggestion flag manually
    triggerLeaderboardSuggestion() {
        this.suggestLeaderboardSubmission = true;
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
            'CPlusPlus': 0,
            'CSharp': 0
        };
        this.pointsHistory = [];
        this.achievements.clear();
        console.log('Point system reset');
    }

    // Create points display UI element
    createPointsDisplay(scene, x, y, scaleFactor = 1) {
        const container = scene.add.container(x, y);
        
        // Background for points display
        const bg = scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(-50 * scaleFactor, -15 * scaleFactor, 100 * scaleFactor, 30 * scaleFactor, 5 * scaleFactor);
        bg.lineStyle(2 * scaleFactor, 0xF1C40F, 0.8);
        bg.strokeRoundedRect(-50 * scaleFactor, -15 * scaleFactor, 100 * scaleFactor, 30 * scaleFactor, 5 * scaleFactor);
        
        // Points text
        const pointsText = scene.add.text(0, 0, `${this.totalPoints} pts`, {
            fontSize: `${14 * scaleFactor}px`,
            color: '#F1C40F',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        container.add([bg, pointsText]);
        container.setDepth(100);
        
        // Update method with null checks
        const update = () => {
            // Check if the text object still exists and hasn't been destroyed
            if (pointsText && pointsText.active && !pointsText.scene.sys.isDestroyed) {
                try {
                    pointsText.setText(`${this.totalPoints} pts`);
                } catch (error) {
                    console.warn('Points display update failed - object may be destroyed:', error);
                }
            }
        };
        
        // Cleanup method
        const destroy = () => {
            if (container && container.active) {
                container.destroy();
            }
        };
        
        return {
            container: container,
            pointsText: pointsText,
            update: update,
            destroy: destroy
        };
    }

    // Reset player HP to maximum (useful for starting new quizzes)
    resetPlayerHP() {
        this.playerHP = this.maxPlayerHP;
        console.log(`Player HP reset to full: ${this.playerHP}/${this.maxPlayerHP}`);
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
        // Auto-save when progress is updated
        try {
            saveGame();
        } catch (error) {
            console.warn('Failed to auto-save game progress:', error);
        }
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

        // Reset point system
        this.resetPoints();
        
        // Reset course progress
        this.courseProgress = {
            'Web_Design': { unlocked: true, completed: false, progress: 0 },
            'Python': { unlocked: true, completed: false, progress: 0 },
            'Java': { unlocked: true, completed: false, progress: 0 },
            'C': { unlocked: false, completed: false, progress: 0 },
            'CPlusPlus': { unlocked: false, completed: false, progress: 0 },
            'CSharp': { unlocked: false, completed: false, progress: 0 }
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
            
            // Auto-save when course progress is updated
            try {
                saveGame();
            } catch (error) {
                console.warn('Failed to auto-save course progress:', error);
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
            
            // Auto-save when course completion is updated
            try {
                saveGame();
            } catch (error) {
                console.warn('Failed to auto-save course completion:', error);
            }
        }
    }
    
    checkForUnlocks() {
        const webDesignCompleted = this.courseProgress['Web_Design'].completed;
        const pythonCompleted = this.courseProgress['Python'].completed;
        
        let unlocked = false;
        
        // Unlock Java when Web Design is completed
        if (webDesignCompleted && !this.courseProgress['Java'].unlocked) {
            this.courseProgress['Java'].unlocked = true;
            unlocked = true;
        }
        
        // Unlock C when Python is completed
        if (pythonCompleted && !this.courseProgress['C'].unlocked) {
            this.courseProgress['C'].unlocked = true;
            unlocked = true;
        }
        
        // Unlock C++ when both Web Design and Python are completed
        if (webDesignCompleted && pythonCompleted && !this.courseProgress['CPlusPlus'].unlocked) {
            this.courseProgress['CPlusPlus'].unlocked = true;
            unlocked = true;
        }
        
        // Unlock C# when Java and C are completed
        if (this.courseProgress['Java'].completed && this.courseProgress['C'].completed && !this.courseProgress['CSharp'].unlocked) {
            this.courseProgress['CSharp'].unlocked = true;
            unlocked = true;
        }
        
        // Auto-save when new courses are unlocked
        if (unlocked) {
            try {
                saveGame();
            } catch (error) {
                console.warn('Failed to auto-save course unlocks:', error);
            }
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
            'CPlusPlus': { unlocked: false, completed: false, progress: 0 },
            'CSharp': { unlocked: false, completed: false, progress: 0 }
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

        // =========================
    // LEADERBOARD INTEGRATION
    // =========================

    // Submit current points to leaderboard
    async submitToLeaderboard(playerName, department = 'Unknown', userId = null, studentId = '') {
        try {
            // Dynamic import of leaderboard service
            const { default: leaderboardService } = await import('./services/leaderboardService.js');
            
            // Generate user ID if not provided
            if (!userId) {
                userId = leaderboardService.generateUserId(playerName);
            }

            const playerData = {
                userId: userId,
                playerName: playerName,
                studentId: studentId, // Add the student ID to the player data
                score: this.totalPoints,
                department: department,
                gameData: {
                    totalPoints: this.totalPoints,
                    topicPoints: this.topicPoints,
                    achievementCount: this.achievements.size,
                    playTime: this.playTime,
                    courseProgress: this.courseProgress
                }
            };

            const result = await leaderboardService.updateBestScore(playerData);
            
            if (result.isNewBest) {
                console.log('🏆 NEW HIGH SCORE! Submitted to leaderboard:', result.newBest);
                
                // Add achievement for submitting to leaderboard
                if (!this.achievements.has('leaderboard_submission')) {
                    this.achievements.add('leaderboard_submission');
                    console.log('🏆 Achievement Unlocked: Leaderboard Climber - First score submission!');
                }
                
                // Add achievement for high scores
                if (result.newBest >= 1000 && !this.achievements.has('score_master')) {
                    this.achievements.add('score_master');
                    console.log('🏆 Achievement Unlocked: Score Master - Reached 1000 points!');
                }
            }

            return result;
        } catch (error) {
            console.error('Failed to submit to leaderboard:', error);
            throw error;
        }
    }

    // Get player's current rank and best score
    async getLeaderboardStats(userId) {
        try {
            const { default: leaderboardService } = await import('./services/leaderboardService.js');
            
            const bestScore = await leaderboardService.getPlayerBestScore(userId);
            const topScores = await leaderboardService.getTopScores('overall', 100);
            
            // Find player's rank
            const playerRank = topScores.findIndex(entry => entry.id === userId) + 1;
            
            return {
                bestScore: bestScore,
                currentScore: this.totalPoints,
                rank: playerRank || 'Unranked',
                isNewBest: this.totalPoints > bestScore
            };
        } catch (error) {
            console.error('Failed to get leaderboard stats:', error);
            return {
                bestScore: 0,
                currentScore: this.totalPoints,
                rank: 'Unknown',
                isNewBest: true
            };
        }
    }

    // Clean up any active leaderboard dialog
    cleanupLeaderboardDialog() {
        if (this.activeLeaderboardDialog) {
            // Clean up Phaser elements
            this.activeLeaderboardDialog.dialogElements.forEach(element => {
                if (element && element.destroy) {
                    element.destroy();
                }
            });
            
            // Clean up HTML elements
            if (this.activeLeaderboardDialog.nameInput && this.activeLeaderboardDialog.nameInput.parentNode) {
                document.body.removeChild(this.activeLeaderboardDialog.nameInput);
            }
            if (this.activeLeaderboardDialog.studentIdInput && this.activeLeaderboardDialog.studentIdInput.parentNode) {
                document.body.removeChild(this.activeLeaderboardDialog.studentIdInput);
            }
            if (this.activeLeaderboardDialog.departmentSelect && this.activeLeaderboardDialog.departmentSelect.parentNode) {
                document.body.removeChild(this.activeLeaderboardDialog.departmentSelect);
            }
            
            // Re-enable carousel interactions if we're in the MainHub scene
            if (this.activeLeaderboardDialog.scene && this.activeLeaderboardDialog.scene.carousel) {
                this.activeLeaderboardDialog.scene.carousel.setInteractive(true);
            }
            
            this.activeLeaderboardDialog = null;
        }
    }

    // Show leaderboard submission dialog
    showLeaderboardDialog(scene) {
        // Clean up any existing dialog first
        this.cleanupLeaderboardDialog();
        
        // Disable carousel interactions if we're in the MainHub scene
        if (scene.carousel) {
            scene.carousel.setInteractive(false);
        }
        
        // Check if we already have player info stored
        const savedPlayerInfo = localStorage.getItem('sci_high_player_info');
        let defaultName = '';
        let defaultDepartment = '';
        let defaultStudentId = '';
        
        if (savedPlayerInfo) {
            const info = JSON.parse(savedPlayerInfo);
            defaultName = info.name || '';
            defaultDepartment = info.department || '';
            defaultStudentId = info.studentId || '';
        }

        // Use VNDialogue scaling system for consistency
        const BASE_WIDTH = 816;
        const BASE_HEIGHT = 624;
        const { width, height } = scene.scale;
        const scaleX = width / BASE_WIDTH;
        const scaleY = height / BASE_HEIGHT;
        const scale = Math.min(scaleX, scaleY);

        // Create overlay to block clicks behind the dialog
        const overlay = scene.add.rectangle(
            scene.cameras.main.width / 2, 
            scene.cameras.main.height / 2, 
            scene.cameras.main.width, 
            scene.cameras.main.height, 
            0x000000, 
            0.8
        ).setOrigin(0.5).setDepth(1999);

        // Create dialog background using VNDialogue styling
        const dialogWidth = 500 * scale;
        const dialogHeight = 450 * scale; // Increased height to accommodate Student ID field
        const borderRadius = 20 * scale;
        const borderThickness = 4 * scale;
        
        const dialogBg = scene.add.graphics();
        dialogBg.fillStyle(0x222244, 0.8);  // Match VNDialogue background
        dialogBg.lineStyle(borderThickness, 0xffffff, 1);  // Match VNDialogue border
        dialogBg.fillRoundedRect(
            scene.cameras.main.width / 2 - dialogWidth / 2,
            scene.cameras.main.height / 2 - dialogHeight / 2,
            dialogWidth,
            dialogHeight,
            borderRadius
        );
        dialogBg.strokeRoundedRect(
            scene.cameras.main.width / 2 - dialogWidth / 2,
            scene.cameras.main.height / 2 - dialogHeight / 2,
            dialogWidth,
            dialogHeight,
            borderRadius
        );
        dialogBg.setDepth(2000);

        // Dialog title with main menu styling
        const title = scene.add.text(
            scene.cameras.main.width / 2, 
            scene.cameras.main.height / 2 - 150 * scale, // Moved up to create more space
            'Submit to Leaderboard', 
            {
                fontFamily: 'Caprasimo-Regular',  // Match main menu font
                fontSize: `${Math.round(24 * scale)}px`,
                color: '#ffff00',  // Match main menu yellow
                stroke: '#000',
                strokeThickness: 4,
                shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
            }
        ).setOrigin(0.5).setDepth(2001);

        // Score display with VNDialogue text styling
        const scoreText = scene.add.text(
            scene.cameras.main.width / 2, 
            scene.cameras.main.height / 2 - 110 * scale, // Moved up to create more space
            `Your Score: ${this.totalPoints} points`, 
            {
                fontFamily: 'Caprasimo-Regular',  // Match VNDialogue font
                fontSize: `${Math.round(18 * scale)}px`,
                color: '#ffffff',  // Match VNDialogue white text
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(2001);

        // Create HTML input elements with improved styling
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Enter your name';
        nameInput.value = defaultName;
        nameInput.style.cssText = `
            position: absolute;
            left: ${scene.cameras.main.width / 2 - 150 * scale}px;
            top: ${scene.cameras.main.height / 2 - 60 * scale}px;
            width: ${300 * scale}px;
            height: ${35 * scale}px;
            z-index: 2002;
            padding: ${8 * scale}px;
            border: ${3 * scale}px solid #ffffcc;
            border-radius: ${10 * scale}px;
            background-color: #222244;
            color: #ffffff;
            font-family: Caprasimo-Regular;
            font-size: ${16 * scale}px;
            box-shadow: 0 ${2 * scale}px ${4 * scale}px rgba(0,0,0,0.3);
            box-sizing: border-box;
        `;
        nameInput.addEventListener('focus', () => {
            nameInput.style.borderColor = '#ffff00';
            nameInput.style.boxShadow = `0 0 ${8 * scale}px rgba(255,255,0,0.5)`;
        });
        nameInput.addEventListener('blur', () => {
            nameInput.style.borderColor = '#ffffcc';
            nameInput.style.boxShadow = `0 ${2 * scale}px ${4 * scale}px rgba(0,0,0,0.3)`;
        });
        document.body.appendChild(nameInput);

        // Add Student ID input field
        const studentIdInput = document.createElement('input');
        studentIdInput.type = 'text';
        studentIdInput.placeholder = 'Enter your Student ID';
        studentIdInput.value = defaultStudentId;
        studentIdInput.style.cssText = `
            position: absolute;
            left: ${scene.cameras.main.width / 2 - 150 * scale}px;
            top: ${scene.cameras.main.height / 2 - 10 * scale}px;
            width: ${300 * scale}px;
            height: ${35 * scale}px;
            z-index: 2002;
            padding: ${8 * scale}px;
            border: ${3 * scale}px solid #ffffcc;
            border-radius: ${10 * scale}px;
            background-color: #222244;
            color: #ffffff;
            font-family: Caprasimo-Regular;
            font-size: ${16 * scale}px;
            box-shadow: 0 ${2 * scale}px ${4 * scale}px rgba(0,0,0,0.3);
            box-sizing: border-box;
        `;
        studentIdInput.addEventListener('focus', () => {
            studentIdInput.style.borderColor = '#ffff00';
            studentIdInput.style.boxShadow = `0 0 ${8 * scale}px rgba(255,255,0,0.5)`;
        });
        studentIdInput.addEventListener('blur', () => {
            studentIdInput.style.borderColor = '#ffffcc';
            studentIdInput.style.boxShadow = `0 ${2 * scale}px ${4 * scale}px rgba(0,0,0,0.3)`;
        });
        document.body.appendChild(studentIdInput);

        const departmentSelect = document.createElement('select');
        departmentSelect.style.cssText = `
            position: absolute;
            left: ${scene.cameras.main.width / 2 - 150 * scale}px;
            top: ${scene.cameras.main.height / 2 + 45 * scale}px;
            width: ${300 * scale}px;
            height: ${40 * scale}px;
            z-index: 2002;
            padding: ${8 * scale}px;
            border: ${3 * scale}px solid #ffffcc;
            border-radius: ${10 * scale}px;
            background-color: #222244;
            color: #ffffff;
            font-family: Caprasimo-Regular;
            font-size: ${14 * scale}px;
            box-shadow: 0 ${2 * scale}px ${4 * scale}px rgba(0,0,0,0.3);
            box-sizing: border-box;
        `;
        departmentSelect.addEventListener('focus', () => {
            departmentSelect.style.borderColor = '#ffff00';
            departmentSelect.style.boxShadow = `0 0 ${8 * scale}px rgba(255,255,0,0.5)`;
        });
        departmentSelect.addEventListener('blur', () => {
            departmentSelect.style.borderColor = '#ffffcc';
            departmentSelect.style.boxShadow = `0 ${2 * scale}px ${4 * scale}px rgba(0,0,0,0.3)`;
        });
        
        const departments = [
            'College of Engineering',
            'College of Computer Studies',
            'College of Business',
            'Senior High School',
            'Junior High School',
            'Other'
        ];
        
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            option.style.cssText = `
                background-color: #222244;
                color: #ffffff;
            `;
            if (dept === defaultDepartment) option.selected = true;
            departmentSelect.appendChild(option);
        });
        
        document.body.appendChild(departmentSelect);

        // Helper function to create styled buttons matching quit confirmation dialog
        const createStyledButton = (x, y, width, height, text, buttonType, callback) => {
            const cornerRadius = 16 * scale;
            const borderWidth = 2 * scale;
            
            // Color scheme based on button type
            let colors;
            if (buttonType === 'confirm') {
                colors = {
                    bg: 0x224422,
                    bgHover: 0x336633,
                    border: 0x44ff44,
                    text: '#44ff44',
                    textHover: '#ffffff'
                };
            } else if (buttonType === 'cancel') {
                colors = {
                    bg: 0x662222,
                    bgHover: 0x883333,
                    border: 0xff4444,
                    text: '#ff4444',
                    textHover: '#ffffff'
                };
            } else if (buttonType === 'info') {
                colors = {
                    bg: 0x444422,
                    bgHover: 0x666633,
                    border: 0xffff44,
                    text: '#ffff44',
                    textHover: '#ffffff'
                };
            }
            
            // Button background
            const btnBg = scene.add.graphics();
            btnBg.fillStyle(colors.bg, 0.9);
            btnBg.fillRoundedRect(x - width / 2, y - height / 2, width, height, cornerRadius);
            btnBg.lineStyle(borderWidth, colors.border, 1);
            btnBg.strokeRoundedRect(x - width / 2, y - height / 2, width, height, cornerRadius);
            btnBg.setDepth(2001);

            // Button text with quit confirmation styling
            const btnText = scene.add.text(x, y, text, {
                fontFamily: 'Caprasimo-Regular',
                fontSize: `${Math.round(16 * scale)}px`,
                color: colors.text,
                stroke: '#000',
                strokeThickness: 2
            }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(2002);

            // Hover effects matching quit confirmation dialog
            btnText.on('pointerover', () => {
                btnText.setStyle({ color: colors.textHover });
                btnBg.clear();
                btnBg.fillStyle(colors.bgHover, 1);
                btnBg.fillRoundedRect(x - width / 2, y - height / 2, width, height, cornerRadius);
                btnBg.lineStyle(borderWidth, colors.border, 1);
                btnBg.strokeRoundedRect(x - width / 2, y - height / 2, width, height, cornerRadius);
            });
            
            btnText.on('pointerout', () => {
                btnText.setStyle({ color: colors.text });
                btnBg.clear();
                btnBg.fillStyle(colors.bg, 0.9);
                btnBg.fillRoundedRect(x - width / 2, y - height / 2, width, height, cornerRadius);
                btnBg.lineStyle(borderWidth, colors.border, 1);
                btnBg.strokeRoundedRect(x - width / 2, y - height / 2, width, height, cornerRadius);
            });
            
            btnText.on('pointerdown', () => {
                btnText.setScale(0.95);
            });
            
            btnText.on('pointerup', () => {
                btnText.setScale(1);
                callback();
            });

            return { bg: btnBg, text: btnText };
        };

        // Create buttons with quit confirmation color scheme
        const confirmBtn = createStyledButton(
            scene.cameras.main.width / 2 - 80 * scale, 
            scene.cameras.main.height / 2 + 120 * scale, // Increased spacing between dropdown and buttons
            120 * scale, 
            40 * scale, 
            'Submit', 
            'confirm',  // Green for positive action (confirm)
            () => {} // Will be set later
        );

        const exitBtn = createStyledButton(
            scene.cameras.main.width / 2 + 80 * scale, 
            scene.cameras.main.height / 2 + 120 * scale, // Increased spacing between dropdown and buttons
            120 * scale, 
            40 * scale, 
            'Exit', 
            'cancel',  // Red for negative action (cancel/exit)
            () => {} // Will be set later
        );

        const viewLeaderboardBtn = createStyledButton(
            scene.cameras.main.width / 2, 
            scene.cameras.main.height / 2 + 170 * scale, // Adjusted to maintain spacing with other buttons
            200 * scale, 
            35 * scale, 
            'View Full Leaderboard', 
            'info',  // Yellow for informational action
            () => {} // Will be set later
        );

        const dialogElements = [
            overlay, 
            dialogBg, 
            title, 
            scoreText, 
            confirmBtn.bg, 
            confirmBtn.text, 
            exitBtn.bg, 
            exitBtn.text, 
            viewLeaderboardBtn.bg, 
            viewLeaderboardBtn.text
        ];

        const closeDialog = () => {
            dialogElements.forEach(element => element.destroy());
            document.body.removeChild(nameInput);
            document.body.removeChild(studentIdInput);
            document.body.removeChild(departmentSelect);
            this.activeLeaderboardDialog = null;
            
            // Re-enable carousel interactions if we're in the MainHub scene
            if (scene.carousel) {
                scene.carousel.setInteractive(true);
            }
        };

        // Track the dialog for cleanup
        this.activeLeaderboardDialog = {
            dialogElements,
            nameInput,
            studentIdInput,
            departmentSelect,
            scene
        };

        // Set up automatic cleanup when the scene is switched
        const originalSceneStart = scene.scene.start;
        const originalSceneStop = scene.scene.stop;
        
        scene.scene.start = (key, data) => {
            this.cleanupLeaderboardDialog();
            return originalSceneStart.call(scene.scene, key, data);
        };
        
        scene.scene.stop = (key) => {
            this.cleanupLeaderboardDialog();
            return originalSceneStop.call(scene.scene, key);
        };

        // Also clean up if the scene is destroyed
        scene.events.once('shutdown', () => {
            this.cleanupLeaderboardDialog();
        });

        // Set up button callbacks now that we have the closeDialog function
        // Confirm (Submit) handler
        confirmBtn.text.off('pointerup').on('pointerup', async () => {
            confirmBtn.text.setScale(1);
            
            const playerName = nameInput.value.trim();
            const studentId = studentIdInput.value.trim();
            const department = departmentSelect.value;

            if (!playerName) {
                alert('Please enter your name!');
                return;
            }

            try {
                // Save player info for future use
                localStorage.setItem('sci_high_player_info', JSON.stringify({
                    name: playerName,
                    studentId: studentId,
                    department: department
                }));

                // Show loading - use gray color scheme
                confirmBtn.text.setText('Submitting...');
                confirmBtn.text.setStyle({ color: '#cccccc' });
                confirmBtn.bg.clear();
                confirmBtn.bg.fillStyle(0x555555, 0.9);
                confirmBtn.bg.fillRoundedRect(
                    scene.cameras.main.width / 2 - 80 * scale - 60 * scale, 
                    scene.cameras.main.height / 2 + 100 * scale - 20 * scale, // Updated to match new button position
                    120 * scale, 
                    40 * scale, 
                    16 * scale
                );
                confirmBtn.bg.lineStyle(2 * scale, 0x888888, 1);
                confirmBtn.bg.strokeRoundedRect(
                    scene.cameras.main.width / 2 - 80 * scale - 60 * scale, 
                    scene.cameras.main.height / 2 + 100 * scale - 20 * scale, // Updated to match new button position
                    120 * scale, 
                    40 * scale, 
                    16 * scale
                );

                // Submit to leaderboard
                const result = await this.submitToLeaderboard(playerName, department, null, studentId);

                closeDialog();

                // Create celebratory background effects
                this.createLeaderboardSuccessEffect(scene, result.isNewBest);

                // Show result
                if (result.isNewBest) {
                    const isOffline = !navigator.onLine;
                    const resultMessage = isOffline ? 
                        `🏆 NEW HIGH SCORE!\nSaved locally: ${result.newBest} points\n(Will sync when online)` :
                        `🏆 NEW HIGH SCORE!\nSubmitted: ${result.newBest} points`;
                    
                    // Create background window for NEW HIGH SCORE
                    const msgBg = scene.add.rectangle(
                        scene.cameras.main.width / 2,
                        scene.cameras.main.height / 2,
                        400, 200,
                        0xFFFFFF
                    );
                    msgBg.setStrokeStyle(4, 0xF1C40F);
                    msgBg.setDepth(1999);
                    msgBg.setAlpha(0.95);
                    
                    // Add inner glow effect
                    const innerGlow = scene.add.rectangle(
                        scene.cameras.main.width / 2,
                        scene.cameras.main.height / 2,
                        390, 190,
                        0xF1C40F,
                        0.1
                    );
                    innerGlow.setDepth(1999);
                    
                    // Add pulsing animation to background
                    scene.tweens.add({
                        targets: [msgBg, innerGlow],
                        scaleX: 1.05,
                        scaleY: 1.05,
                        duration: 1000,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                        
                    const resultText = scene.add.text(
                        scene.cameras.main.width / 2,
                        scene.cameras.main.height / 2,
                        resultMessage,
                        {
                            fontSize: '24px',
                            color: '#27AE60',
                            fontFamily: 'Arial',
                            fontStyle: 'bold',
                            align: 'center',
                            stroke: '#FFFFFF',
                            strokeThickness: 2
                        }
                    ).setOrigin(0.5).setDepth(2000);
                    
                    // Auto-hide result window after 5 seconds
                    scene.time.delayedCall(5000, () => {
                        if (msgBg) msgBg.destroy();
                        if (innerGlow) innerGlow.destroy();
                        if (resultText) resultText.destroy();
                    });
                } else {
                    const isOffline = !navigator.onLine;
                    const resultMessage = isOffline ?
                        `Score saved locally!\nCurrent: ${result.submittedScore || this.totalPoints}\nBest: ${result.currentBest}\n(Will sync when online)` :
                        `Score submitted!\nCurrent: ${result.submittedScore || this.totalPoints}\nBest: ${result.currentBest}`;
                    
                    // Create simpler background for regular score submission
                    const msgBg = scene.add.rectangle(
                        scene.cameras.main.width / 2,
                        scene.cameras.main.height / 2,
                        350, 150,
                        0xFFFFFF,
                        0.9
                    );
                    msgBg.setStrokeStyle(2, 0x3498DB);
                    msgBg.setDepth(1999);
                        
                    const resultText = scene.add.text(
                        scene.cameras.main.width / 2,
                        scene.cameras.main.height / 2,
                        resultMessage,
                        {
                            fontSize: '18px',
                            color: '#3498DB',
                            fontFamily: 'Arial',
                            align: 'center'
                        }
                    ).setOrigin(0.5).setDepth(2000);
                    
                    // Auto-hide result window after 5 seconds
                    scene.time.delayedCall(5000, () => {
                        if (msgBg) msgBg.destroy();
                        if (resultText) resultText.destroy();
                    });
                }

                // Auto-hide result after 5 seconds (increased to enjoy the effects)
                scene.time.delayedCall(5000, () => {
                    const resultText = scene.children.list.find(child => 
                        child.depth === 2000 && child.type === 'Text'
                    );
                    if (resultText) resultText.destroy();
                });

            } catch (error) {
                closeDialog();
                console.error('Submission failed:', error);
                
                // Show simple error message
                const errorText = scene.add.text(
                    scene.cameras.main.width / 2,
                    scene.cameras.main.height / 2,
                    `❌ Submission Failed\nPlease try again later.`,
                    {
                        fontSize: '18px',
                        color: '#E74C3C',
                        fontFamily: 'Arial',
                        align: 'center',
                        backgroundColor: '#FFFFFF',
                        padding: { x: 20, y: 15 }
                    }
                ).setOrigin(0.5).setDepth(2000);

                // Auto-hide error after 3 seconds
                scene.time.delayedCall(3000, () => {
                    if (errorText) errorText.destroy();
                });
            }
        });

        // Exit handler
        exitBtn.text.off('pointerup').on('pointerup', () => {
            exitBtn.text.setScale(1);
            closeDialog();
        });

        // View leaderboard handler
        viewLeaderboardBtn.text.off('pointerup').on('pointerup', () => {
            viewLeaderboardBtn.text.setScale(1);
            this.openLeaderboardPage();
        });

        // Focus on name input
        nameInput.focus();
    }

    // Open external leaderboard page
    openLeaderboardPage() {
        // Open the leaderboards.html page in a new tab/window
        window.open('leaderboards.html', '_blank');
    }

    // Create celebratory background effects when leaderboard score is submitted
    createLeaderboardSuccessEffect(scene, isNewBest = false) {
        const { width, height } = scene.cameras.main;
        
        // Play success sound effects
        if (scene.sound) {
            if (isNewBest) {
                // Play combo sound for new best score
                const comboSound = scene.sound.add('se_combo', { volume: 0.7 });
                if (comboSound) comboSound.play();
                
                // Add a second confirm sound after a delay
                scene.time.delayedCall(500, () => {
                    const confirmSound = scene.sound.add('se_confirm', { volume: 0.5 });
                    if (confirmSound) confirmSound.play();
                });
            } else {
                // Play confirm sound for regular submission
                const confirmSound = scene.sound.add('se_confirm', { volume: 0.6 });
                if (confirmSound) confirmSound.play();
            }
        }
        
        // Create background overlay with animated color
        const successOverlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x27AE60, 0.1);
        successOverlay.setDepth(1500);
        
        // Animate the background color
        scene.tweens.add({
            targets: successOverlay,
            alpha: isNewBest ? 0.3 : 0.2,
            duration: 500,
            yoyo: true,
            repeat: 2,
            ease: 'Power2',
            onComplete: () => {
                scene.tweens.add({
                    targets: successOverlay,
                    alpha: 0,
                    duration: 1500,
                    onComplete: () => successOverlay.destroy()
                });
            }
        });

        // Create confetti/celebration particles
        this.createConfettiEffect(scene, isNewBest);
        
        // Create pulsing rings effect
        this.createPulseRingsEffect(scene, isNewBest);
        
        // Create floating score indicators
        this.createFloatingScoreEffect(scene, isNewBest);
        
        // Screen flash effect for new best scores
        if (isNewBest) {
            this.createScreenFlashEffect(scene);
        }
    }

    createConfettiEffect(scene, isNewBest) {
        const { width, height } = scene.cameras.main;
        const particleCount = isNewBest ? 50 : 30;
        const colors = [0xF1C40F, 0xE74C3C, 0x3498DB, 0x2ECC71, 0x9B59B6, 0xE67E22];
        
        for (let i = 0; i < particleCount; i++) {
            const x = Math.random() * width;
            const y = -50;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 8 + 4;
            
            const particle = scene.add.rectangle(x, y, size, size, color);
            particle.setDepth(1600);
            particle.setRotation(Math.random() * Math.PI * 2);
            
            // Animate particle falling
            scene.tweens.add({
                targets: particle,
                y: height + 50,
                x: x + (Math.random() - 0.5) * 200,
                rotation: particle.rotation + Math.PI * 4,
                duration: 3000 + Math.random() * 2000,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
            
            // Add slight scale animation
            scene.tweens.add({
                targets: particle,
                scaleX: 0.5 + Math.random() * 0.5,
                scaleY: 0.5 + Math.random() * 0.5,
                duration: 1000 + Math.random() * 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    createPulseRingsEffect(scene, isNewBest) {
        const { width, height } = scene.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;
        const ringCount = isNewBest ? 4 : 2;
        
        for (let i = 0; i < ringCount; i++) {
            setTimeout(() => {
                const ring = scene.add.circle(centerX, centerY, 10, isNewBest ? 0xF1C40F : 0x3498DB, 0);
                ring.setStrokeStyle(4, isNewBest ? 0xF39C12 : 0x2980B9, 0.8);
                ring.setDepth(1550);
                
                scene.tweens.add({
                    targets: ring,
                    radius: Math.max(width, height) * 0.8,
                    alpha: 0,
                    duration: 2000,
                    ease: 'Power2',
                    onComplete: () => ring.destroy()
                });
            }, i * 300);
        }
    }

    createFloatingScoreEffect(scene, isNewBest) {
        const { width, height } = scene.cameras.main;
        const scoreTexts = isNewBest ? 
            ['🏆 AMAZING!', '⭐ EXCELLENT!', '🎉 FANTASTIC!'] : 
            ['✅ GREAT!', '👍 NICE!', '💫 GOOD JOB!'];
        
        scoreTexts.forEach((text, index) => {
            setTimeout(() => {
                const scoreText = scene.add.text(
                    Math.random() * width * 0.6 + width * 0.2,
                    height + 50,
                    text,
                    {
                        fontSize: isNewBest ? '28px' : '20px',
                        color: isNewBest ? '#F1C40F' : '#3498DB',
                        fontFamily: 'Arial',
                        fontStyle: 'bold',
                        stroke: '#FFFFFF',
                        strokeThickness: 3
                    }
                ).setOrigin(0.5).setDepth(1650);
                
                scene.tweens.add({
                    targets: scoreText,
                    y: -100,
                    alpha: { from: 1, to: 0 },
                    scale: { from: 0.5, to: 1.2 },
                    duration: 3000,
                    ease: 'Power2',
                    onComplete: () => scoreText.destroy()
                });
                
                // Add gentle sway
                scene.tweens.add({
                    targets: scoreText,
                    x: scoreText.x + (Math.random() - 0.5) * 100,
                    duration: 3000,
                    ease: 'Sine.easeInOut'
                });
            }, index * 400);
        });
    }

    createScreenFlashEffect(scene) {
        const { width, height } = scene.cameras.main;
        
        const flash = scene.add.rectangle(width / 2, height / 2, width, height, 0xFFFFFF, 0.8);
        flash.setDepth(1700);
        
        scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                // Second flash
                flash.setAlpha(0.4);
                scene.tweens.add({
                    targets: flash,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => flash.destroy()
                });
            }
        });
    }
}

class Character {
    constructor() {
        this.quest1 = 0;
        this.quest1Desc = "Start Noah's story to learn HTML basics";
        this.quest2 = 0;
        this.quest2Desc = "Continue the story to learn CSS styling";
        this.quest3 = 0;
        this.quest3Desc = "Complete the story to learn JavaScript";
        
        // Story progress tracking
        this.storyProgress = {
            chapter: 0,
            scene: 0,
            completed: false
        };
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

// Customize quest descriptions for each character
// char1 (Noah) - Web Development
char1.quest1Desc = "Start Noah's story to learn HTML basics";
char1.quest2Desc = "Continue the story to learn CSS styling";
char1.quest3Desc = "Complete the story to learn JavaScript";

// char2 (Lily) - Python
char2.quest1Desc = "Begin Lily's Python journey with fundamentals";
char2.quest2Desc = "Learn Python control structures and functions";
char2.quest3Desc = "Master advanced Python concepts with Lily";

// char3 (Damian) - Java
char3.quest1Desc = "Start Damian's Java adventure with foundations";
char3.quest2Desc = "Explore object-oriented programming concepts";
char3.quest3Desc = "Complete advanced Java techniques with Damian";

// char4 (Bella) - Future content
char4.quest1Desc = "Bella's programming journey (Coming Soon)";
char4.quest2Desc = "Advanced concepts with Bella (Coming Soon)";
char4.quest3Desc = "Master programming with Bella (Coming Soon)";

// char5 (Finley) - Future content
char5.quest1Desc = "Finley's coding lessons (Coming Soon)";
char5.quest2Desc = "Advanced topics with Finley (Coming Soon)";
char5.quest3Desc = "Complete the journey with Finley (Coming Soon)";

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
