// Utility to stop any currently playing BGM and play a new one
export function playExclusiveBGM(scene, key, config = {}) {
    // Find any currently playing BGM
    const playingBGM = scene.sound.sounds.find(
        sound =>
            sound.key &&
            sound.key.toLowerCase().includes('bgm') &&
            sound.isPlaying
    );

    // If the requested BGM is already playing, do nothing
    if (playingBGM && playingBGM.key === key) {
        return playingBGM;
    }

    // Stop all currently playing BGM
    scene.sound.sounds.forEach(sound => {
        if (
            sound.key &&
            sound.key.toLowerCase().includes('bgm') &&
            sound.isPlaying
        ) {
            sound.stop();
        }
    });

    // Apply saved volume setting to config if not explicitly set
    const finalConfig = {
        volume: bgmVolume,
        ...config
    };

    // Get or create the requested BGM
    let bgm = scene.sound.get(key);
    if (!bgm) {
        bgm = scene.sound.add(key, finalConfig);
    }

    // Set the volume based on saved settings
    bgm.setVolume(bgmVolume);

    // If the BGM is paused, resume it; otherwise, play from start
    if (bgm.isPaused) {
        bgm.resume();
    } else {
        bgm.play(finalConfig);
    }
    return bgm;
}

export let bgmVolume = 1;
export let seVolume = 1;

// Load saved volume settings from localStorage on module initialization
function loadVolumeSettings() {
    try {
        const savedBgmVolume = localStorage.getItem('sci_high_bgm_volume');
        const savedSeVolume = localStorage.getItem('sci_high_se_volume');
        
        if (savedBgmVolume !== null) {
            bgmVolume = parseFloat(savedBgmVolume);
        }
        if (savedSeVolume !== null) {
            seVolume = parseFloat(savedSeVolume);
        }
        
        console.log('Volume settings loaded from localStorage:', { bgmVolume, seVolume });
    } catch (error) {
        console.warn('Failed to load volume settings from localStorage:', error);
    }
}

// Save volume settings to localStorage
function saveVolumeSettings() {
    try {
        localStorage.setItem('sci_high_bgm_volume', bgmVolume.toString());
        localStorage.setItem('sci_high_se_volume', seVolume.toString());
        console.log('Volume settings saved to localStorage:', { bgmVolume, seVolume });
    } catch (error) {
        console.warn('Failed to save volume settings to localStorage:', error);
    }
}

export function setBgmVolume(value) {
    bgmVolume = value;
    saveVolumeSettings();
}

export function setSeVolume(value) {
    seVolume = value;
    saveVolumeSettings();
}

// Getter functions for current volume values
export function getBgmVolume() {
    return bgmVolume;
}

export function getSeVolume() {
    return seVolume;
}

// Load settings when module is imported
loadVolumeSettings();

// Utility function to play sound effects with proper volume
export function playSE(scene, key, config = {}) {
    const finalConfig = {
        volume: seVolume,
        ...config
    };
    return scene.sound.play(key, finalConfig);
}

// Utility function to add sound effects with proper volume
export function addSE(scene, key, config = {}) {
    const finalConfig = {
        volume: seVolume,
        ...config
    };
    const sound = scene.sound.add(key, finalConfig);
    sound.setVolume(seVolume);
    return sound;
}

// Utility to update volumes based on key name
export function updateSoundVolumes(scene) {
    scene.sound.sounds.forEach(sound => {
        if (sound.key && sound.key.toLowerCase().includes('se')) {
            sound.setVolume(seVolume);
        } else if (sound.key && sound.key.toLowerCase().includes('bgm')) {
            sound.setVolume(bgmVolume);
        }
    });
}

// Enhanced version that also updates by sound object properties
export function updateAllSoundVolumes(scene) {
    // Update existing sound objects
    updateSoundVolumes(scene);
    
    // Update scene's sound objects if they exist
    Object.keys(scene).forEach(key => {
        if (key.includes('se_') || key.includes('Sound') || key.includes('sound')) {
            const soundObj = scene[key];
            if (soundObj && typeof soundObj.setVolume === 'function') {
                if (key.toLowerCase().includes('se') || key.toLowerCase().includes('sound')) {
                    soundObj.setVolume(seVolume);
                } else if (key.toLowerCase().includes('bgm')) {
                    soundObj.setVolume(bgmVolume);
                }
            }
        }
    });
}

// Utility to create a slider (returns {slider, handle})
export function createVolumeSlider(scene, x, y, value, onChange) {
    const slider = scene.add.rectangle(x, y, 200, 10, 0x888888).setOrigin(0, 0.5).setInteractive();
    const handle = scene.add.circle(x + value * 200, y, 12, 0xffff00).setInteractive();

    scene.input.setDraggable(handle);
    handle.on('drag', (pointer, dragX) => {
        dragX = Phaser.Math.Clamp(dragX, x, x + 200);
        handle.x = dragX;
        const newValue = (dragX - x) / 200;
        onChange(newValue);
    });

    return { slider, handle };
}