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

    // Get or create the requested BGM
    let bgm = scene.sound.get(key);
    if (!bgm) {
        bgm = scene.sound.add(key, config);
    }

    // If the BGM is paused, resume it; otherwise, play from start
    if (bgm.isPaused) {
        bgm.resume();
    } else {
        bgm.play(config);
    }
    return bgm;
}

export let bgmVolume = 1;
export let seVolume = 1;

export function setBgmVolume(value) {
    bgmVolume = value;
}

export function setSeVolume(value) {
    seVolume = value;
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