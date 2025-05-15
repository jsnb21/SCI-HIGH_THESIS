// Utility to stop any currently playing BGM and play a new one
export function playExclusiveBGM(scene, key, config = {}) {
    // If the requested BGM is already playing, do nothing
    const currentBGM = scene.sound.get(key);
    if (currentBGM && currentBGM.isPlaying) {
        return currentBGM;
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

    // If the requested BGM is not already created, add it
    let bgm = currentBGM;
    if (!bgm) {
        bgm = scene.sound.add(key, config);
    }
    bgm.play(config);
    return bgm;
}