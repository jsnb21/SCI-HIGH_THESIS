import Phaser from 'phaser';
import BaseScene from '../BaseScene.js';

export default class CareerStatsScreen extends BaseScene {
    constructor() {
        super('CareerStatsScreen');
        this.careerData = null;
    }

    init(data) {
        this.studentId = data.studentId;
    }

    async create() {
        super.create();
        
        const { width, height } = this.scale;
        
        // Create gradient background
        const gradient = this.add.graphics();
        gradient.fillGradientStyle(0x000000, 0x000000, 0x1a1a2e, 0x1a1a2e, 1);
        gradient.fillRect(0, 0, width, height);
        
        // Show loading
        const loadingText = this.add.text(width/2, height/2, 'Loading Career Stats...', {
            fontSize: '24px',
            fontFamily: 'Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        try {
            // Load career stats
            const { default: careerStatsService } = await import('../services/careerStatsService.js');
            this.careerData = await careerStatsService.getCareerStats(this.studentId);
            
            loadingText.destroy();
            this.displayCareerStats();
            
        } catch (error) {
            console.error('Error loading career stats:', error);
            loadingText.setText('Failed to load career stats');
            loadingText.setTint(0xff4444);
        }
    }

    displayCareerStats() {
        const { width, height } = this.scale;
        
        if (!this.careerData) {
            this.add.text(width/2, height/2, 'No career data found', {
                fontSize: '20px',
                fontFamily: 'Arial',
                fill: '#ff4444'
            }).setOrigin(0.5);
            return;
        }

        const stats = this.careerData.careerStats;
        const recentSessions = this.careerData.recentSessions;
        
        // Title
        this.add.text(width/2, 60, `${this.careerData.studentInfo.fullName}'s Career Stats`, {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            fill: '#00ff88'
        }).setOrigin(0.5);

        // Main stats panel
        this.createStatsPanel(width/2 - 350, 120, 320, 300, 'Overall Performance', [
            `Total Sessions: ${stats.totalSessions}`,
            `Total Points: ${stats.totalPoints.toLocaleString()}`,
            `Correct Answers: ${stats.totalCorrectAnswers}`,
            `Wrong Answers: ${stats.totalWrongAnswers}`,
            `Average Accuracy: ${stats.averageAccuracy}%`,
            `Highest Streak: ${stats.highestStreak}`
        ]);

        // Course completion status panel
        this.createCourseCompletionPanel(width/2 + 30, 120, 320, 300);

        // Recent sessions panel
        const recentText = [];
        for (let i = 1; i <= 3; i++) {
            const session = recentSessions[`session${i}`];
            if (session) {
                const date = new Date(session.timestamp).toLocaleDateString();
                recentText.push(`${i}. ${session.courseTopic} - ${session.totalScore} pts (${session.accuracyPercentage}%) - ${date}`);
            } else {
                recentText.push(`${i}. No session data`);
            }
        }
        
        this.createStatsPanel(width/2 - 160, 450, 320, 180, 'Recent Sessions', recentText);

        // Back button
        this.createBackButton();
    }

    createCourseCompletionPanel(x, y, w, h) {
        // Panel background
        const panel = this.add.rectangle(x + w/2, y + h/2, w, h, 0x16213e);
        panel.setStrokeStyle(2, 0x0f4c75);

        // Panel title
        this.add.text(x + w/2, y + 20, 'Course Completion Status', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            fill: '#3282b8'
        }).setOrigin(0.5);

        // Get completion status
        const stats = this.careerData.careerStats;
        const courseStatus = stats.courseCompletionStatus || {};
        
        const courses = [
            { key: 'python', name: 'Python' },
            { key: 'java', name: 'Java' },
            { key: 'csharp', name: 'C#' },
            { key: 'cpp', name: 'C++' },
            { key: 'c', name: 'C' },
            { key: 'webdesign', name: 'Web Design' }
        ];

        // Display course completion with checkmarks
        courses.forEach((course, index) => {
            const isCompleted = courseStatus[course.key] || false;
            const checkmark = isCompleted ? '✓' : '✗';
            const color = isCompleted ? '#00ff88' : '#ff4444';
            const completionText = isCompleted ? 'Completed' : 'Not Started';
            
            // Course name
            this.add.text(x + 20, y + 60 + (index * 30), course.name, {
                fontSize: '14px',
                fontFamily: 'Arial',
                fill: '#ffffff'
            });

            // Checkmark and status
            this.add.text(x + 140, y + 60 + (index * 30), `${checkmark} ${completionText}`, {
                fontSize: '14px',
                fontFamily: 'Arial',
                fill: color,
                fontWeight: 'bold'
            });

            // Show session count if completed
            if (isCompleted && stats.coursesCompleted && stats.coursesCompleted[course.name]) {
                const courseData = stats.coursesCompleted[course.name];
                this.add.text(x + 250, y + 60 + (index * 30), `(${courseData.completedCount}x)`, {
                    fontSize: '12px',
                    fontFamily: 'Arial',
                    fill: '#888888'
                });
            }
        });

        // Completion percentage
        const completedCount = Object.values(courseStatus).filter(Boolean).length;
        const completionPercentage = Math.round((completedCount / courses.length) * 100);
        
        this.add.text(x + w/2, y + h - 30, `Overall Progress: ${completedCount}/${courses.length} (${completionPercentage}%)`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            fill: '#F4CE14'
        }).setOrigin(0.5);
    }

    createStatsPanel(x, y, w, h, title, textArray) {
        // Panel background
        const panel = this.add.rectangle(x + w/2, y + h/2, w, h, 0x16213e);
        panel.setStrokeStyle(2, 0x0f4c75);

        // Panel title
        this.add.text(x + w/2, y + 20, title, {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            fill: '#3282b8'
        }).setOrigin(0.5);

        // Panel content
        textArray.forEach((text, index) => {
            this.add.text(x + 10, y + 50 + (index * 25), text, {
                fontSize: '14px',
                fontFamily: 'Arial',
                fill: '#ffffff'
            });
        });
    }

    createBackButton() {
        const { width, height } = this.scale;
        
        const backButton = this.add.rectangle(width - 100, height - 50, 120, 40, 0x0f4c75);
        backButton.setStrokeStyle(2, 0x3282b8);
        backButton.setInteractive({ useHandCursor: true });

        const backText = this.add.text(width - 100, height - 50, 'Back to Hub', {
            fontSize: '16px',
            fontFamily: 'Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        backButton.on('pointerover', () => {
            backButton.setFillStyle(0x3282b8);
        });

        backButton.on('pointerout', () => {
            backButton.setFillStyle(0x0f4c75);
        });

        backButton.on('pointerdown', () => {
            this.scene.start('MainHub');
        });
    }
}
