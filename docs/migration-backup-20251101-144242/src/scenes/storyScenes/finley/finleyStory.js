import BaseCharacterStoryScene from '../_base/BaseCharacterStoryScene.js';

export default class FinleyStory extends BaseCharacterStoryScene {
  constructor(){
    super('FinleyStory');
  }

  getConfig(){
    return {
      key: 'FinleyStory',
      portraitKey: 'FinleyPortrait',
      portraitPath: 'assets/sprites/npcs/Finley.png',
      backgroundColor: '#d9e7b8',
      openingLine: 'Need something?',
      choices: [
        'Just checking up on you',
        'Can you teach me something?',
        'No, just passing by'
      ],
      responses: (index, text) => {
        switch(index){
          case 0: return "I'm fine. Staying focused. You should too.";
          case 1: return "Maybe later. Master the basics first—then we'll talk.";
          case 2: return "Then don't waste time lingering.";
          default: return 'Alright.';
        }
      }
    };
  }
}
