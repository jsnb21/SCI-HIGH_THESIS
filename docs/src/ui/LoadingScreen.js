import Phaser from 'phaser';

export default class LoadingScreen {
    constructor(scene) {
        this.scene = scene;
        this.loadingGroup = null;
        this.progressBar = null;
        this.progressText = null;
        this.loadingText = null;
        this.isShowing = false;
    }

    show(targetScene = 'Loading...', showProgress = false) {
        if (this.isShowing) return;
        this.isShowing = true;

        const { width, height } = this.scene.scale;
        
        // Create loading group
        this.loadingGroup = this.scene.add.group();
        
        // Background overlay
        const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9);
        this.loadingGroup.add(overlay);
        
        // Loading text
        this.loadingText = this.scene.add.text(width / 2, height / 2 - 30, targetScene, {
            fontFamily: 'Caprasimo-Regular, Arial',
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5);
        this.loadingGroup.add(this.loadingText);

        if (showProgress) {
            this.createProgressBar();
        }

        // Set high depth to appear above everything
        this.loadingGroup.children.entries.forEach(child => {
            child.setDepth(1000);
        });

        // Fade in animation
        this.loadingGroup.children.entries.forEach(child => {
            child.setAlpha(0);
        });

        this.scene.tweens.add({
            targets: this.loadingGroup.children.entries,
            alpha: 1,
            duration: 300,
            ease: 'Quad.easeOut'
        });
    }

    createProgressBar() {
        const { width, height } = this.scene.scale;
        const barWidth = 300;
        const barHeight = 20;
        const barX = width / 2 - barWidth / 2;
        const barY = height / 2 + 60;

        // Progress bar background
        const progressBg = this.scene.add.graphics();
        progressBg.fillStyle(0x333333, 1);
        progressBg.fillRoundedRect(barX, barY, barWidth, barHeight, 10);
        progressBg.lineStyle(2, 0xffffff, 1);
        progressBg.strokeRoundedRect(barX, barY, barWidth, barHeight, 10);
        this.loadingGroup.add(progressBg);

        // Progress bar fill
        this.progressBar = this.scene.add.graphics();
        this.loadingGroup.add(this.progressBar);

        // Progress text
        this.progressText = this.scene.add.text(width / 2, barY + barHeight + 20, '0%', {
            fontFamily: 'Caprasimo-Regular, Arial',
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5);
        this.loadingGroup.add(this.progressText);
    }

    updateProgress(percentage) {
        if (!this.progressBar || !this.progressText) return;

        const { width } = this.scene.scale;
        const barWidth = 300;
        const barHeight = 20;
        const barX = width / 2 - barWidth / 2;
        const barY = this.scene.scale.height / 2 + 60;

        // Update progress bar
        this.progressBar.clear();
        this.progressBar.fillStyle(0x4CAF50, 1);
        const fillWidth = (barWidth - 4) * (percentage / 100);
        this.progressBar.fillRoundedRect(barX + 2, barY + 2, fillWidth, barHeight - 4, 8);

        // Update progress text
        this.progressText.setText(`${Math.round(percentage)}%`);
    }

    hide(callback = null) {
        if (!this.isShowing || !this.loadingGroup) return;

        this.isShowing = false;

        // Stop spinner animation
        if (this.spinnerTween) {
            this.spinnerTween.stop();
            this.spinnerTween = null;
        }

        // Fade out animation
        this.scene.tweens.add({
            targets: this.loadingGroup.children.entries,
            alpha: 0,
            duration: 300,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.destroy();
                if (callback) callback();
            }
        });
    }

    destroy() {
        if (this.loadingGroup) {
            this.loadingGroup.clear(true, true);
            this.loadingGroup = null;
        }

        this.progressBar = null;
        this.progressText = null;
        this.loadingText = null;
        this.isShowing = false;
    }

    // Static method for easy scene transitions with loading
    static transitionToScene(currentScene, targetSceneName, delay = 1000) {
        const loading = new LoadingScreen(currentScene);
        loading.show(targetSceneName);

        currentScene.time.delayedCall(delay, () => {
            loading.hide(() => {
                currentScene.scene.start(targetSceneName);
            });
        });
    }

    // Static method for scene transitions with progress simulation
    static transitionToSceneWithProgress(currentScene, targetSceneName, message = 'Loading...', totalTime = 2000) {
        const loading = new LoadingScreen(currentScene);
        loading.show(message, true);

        let progress = 0;
        const updateInterval = 50; // Update every 50ms
        const increment = (100 / totalTime) * updateInterval;

        const progressTimer = currentScene.time.addEvent({
            delay: updateInterval,
            repeat: Math.floor(totalTime / updateInterval),
            callback: () => {
                progress += increment;
                if (progress > 100) progress = 100;
                loading.updateProgress(progress);

                if (progress >= 100) {
                    progressTimer.destroy();
                    currentScene.time.delayedCall(300, () => {
                        loading.hide(() => {
                            currentScene.scene.start(targetSceneName);
                        });
                    });
                }
            }
        });
    }

    // Static method for simple scene transitions
    static transitionToScene(currentScene, targetSceneName, message = 'Loading...', duration = 800) {
        const loading = new LoadingScreen(currentScene);
        loading.show(message, false);

        currentScene.time.delayedCall(duration, () => {
            loading.hide(() => {
                currentScene.scene.start(targetSceneName);
            });
        });
    }

    // Static method for loading MainHub with all related scenes
    static transitionToMainHub(currentScene, message = 'Loading Main Hub...', totalTime = 2500) {
        const loading = new LoadingScreen(currentScene);
        loading.show(message, true);

        // Define all MainHub related scenes to "preload"
        const relatedScenes = [
            'MainHub',
            'ComputerLab', 
            'Classroom',
            'BaseLibraryScene',
            'Office'
        ];

        let progress = 0;
        let currentSceneIndex = 0;
        const updateInterval = 100; // Update every 100ms
        const timePerScene = totalTime / relatedScenes.length;
        const incrementPerUpdate = (100 / relatedScenes.length) / (timePerScene / updateInterval);

        const progressTimer = currentScene.time.addEvent({
            delay: updateInterval,
            repeat: Math.floor(totalTime / updateInterval),
            callback: () => {
                progress += incrementPerUpdate;
                if (progress > 100) progress = 100;

                // Update loading text to show current scene being "loaded"
                const sceneIndex = Math.floor((progress / 100) * relatedScenes.length);
                if (sceneIndex !== currentSceneIndex && sceneIndex < relatedScenes.length) {
                    currentSceneIndex = sceneIndex;
                    const sceneName = relatedScenes[sceneIndex];
                    const displayName = sceneName.replace(/([A-Z])/g, ' $1').trim(); // Add spaces before capitals
                    loading.loadingText.setText(`Loading ${displayName}...`);
                }

                loading.updateProgress(progress);

                if (progress >= 100) {
                    progressTimer.destroy();
                    loading.loadingText.setText('Entering Main Hub...');
                    currentScene.time.delayedCall(300, () => {
                        loading.hide(() => {
                            currentScene.scene.start('MainHub');
                        });
                    });
                }
            }
        });
    }

    // Static method for loading Computer Lab courses
    static transitionToCourse(currentScene, targetSceneName, courseName, data = null, totalTime = 1800) {
        const loading = new LoadingScreen(currentScene);
        loading.show(`Loading ${courseName}...`, true);

        // Simulate loading different course components
        const courseComponents = [
            'Course Materials',
            'Practice Exercises', 
            'Code Editor',
            'Quiz System',
            'Progress Tracker'
        ];

        let progress = 0;
        let currentComponentIndex = 0;
        const updateInterval = 80; // Update every 80ms for smoother animation
        const timePerComponent = totalTime / courseComponents.length;
        const incrementPerUpdate = (100 / courseComponents.length) / (timePerComponent / updateInterval);

        const progressTimer = currentScene.time.addEvent({
            delay: updateInterval,
            repeat: Math.floor(totalTime / updateInterval),
            callback: () => {
                progress += incrementPerUpdate;
                if (progress > 100) progress = 100;

                // Update loading text to show current component being "loaded"
                const componentIndex = Math.floor((progress / 100) * courseComponents.length);
                if (componentIndex !== currentComponentIndex && componentIndex < courseComponents.length) {
                    currentComponentIndex = componentIndex;
                    const componentName = courseComponents[componentIndex];
                    loading.loadingText.setText(`Loading ${componentName}...`);
                }

                loading.updateProgress(progress);

                if (progress >= 100) {
                    progressTimer.destroy();
                    loading.loadingText.setText(`Entering ${courseName}...`);
                    currentScene.time.delayedCall(300, () => {
                        loading.hide(() => {
                            if (data) {
                                currentScene.scene.start(targetSceneName, data);
                            } else {
                                currentScene.scene.start(targetSceneName);
                            }
                        });
                    });
                }
            }
        });
    }
}
