import gameManager, { char1, char2, char3, char4, char5 } from './gameManager.js';

// Save function with slot
function saveGame(slot = 'default') {
    const saveData = {
        playerHP: gameManager.getPlayerHP(),
        playTime: gameManager.getPlayTime(),
        gameProgress: gameManager.getGameProgress(),
        courseProgress: gameManager.courseProgress,
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

// Apply loaded save data to game manager
function applySaveData(saveData) {
    if (!saveData) return false;
    
    gameManager.setPlayerHP(saveData.playerHP || 100);
    gameManager.setPlayTime(saveData.playTime || 0);
    gameManager.setGameProgress(saveData.gameProgress || 0);
    
    // Apply course progress if it exists in save data
    if (saveData.courseProgress) {
        gameManager.courseProgress = { ...saveData.courseProgress };
    }
    
    // Apply character data
    if (saveData.characters && saveData.characters.length >= 5) {
        Object.assign(char1, saveData.characters[0]);
        Object.assign(char2, saveData.characters[1]);
        Object.assign(char3, saveData.characters[2]);
        Object.assign(char4, saveData.characters[3]);
        Object.assign(char5, saveData.characters[4]);
    }
    
    return true;
}

export { saveGame, getAllSaveKeys, loadGame, applySaveData };