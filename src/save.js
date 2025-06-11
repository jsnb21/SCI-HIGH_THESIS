import gameManager, { char1, char2, char3, char4, char5 } from './gameManager.js';

// Save function with slot
function saveGame(slot = 'default') {
    const saveData = {
        playerHP: gameManager.getPlayerHP(),
        playTime: gameManager.getPlayTime(),
        gameProgress: gameManager.getGameProgress(),
        characters: [
            { ...char1 },
            { ...char2 },
            { ...char3 },
            { ...char4 },
            { ...char5 }
        ]
    };
    localStorage.setItem(`sciHighSave_${slot}`, JSON.stringify(saveData));
    alert('Game saved!');
}

// Get all save keys
function getAllSaveKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('sciHighSave_')) {
            keys.push(key);
        }
    }
    return keys;
}

// Load function
function loadGame(slot = 'default') {
    const saveStr = localStorage.getItem(`sciHighSave_${slot}`);
    if (!saveStr) return null;
    try {
        return JSON.parse(saveStr);
    } catch (e) {
        return null;
    }
}

export { saveGame, getAllSaveKeys, loadGame };