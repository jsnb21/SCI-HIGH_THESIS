import BaseCharacterStoryScene from '../_base/BaseCharacterStoryScene.js';

export default class DamianStory extends BaseCharacterStoryScene {
  constructor(){
    super('DamianStory');
  }

  getConfig(){
    return {
      key: 'DamianStory',
      portraitKey: 'DamianPortrait',
      portraitPath: 'assets/sprites/npcs/Damian.png',
      backgroundColor: '#b8c7d9',
      openingLine: 'Hey there! Need help with something?',
      choices: [
        "How's your day going?",
        'Teach me a trick!',
        'Just wandering around'
      ],
      responses: (index, text) => {
        switch(index){
          case 0: return 'Pretty great! Been tinkering with some side projects.';
          case 1: return 'Best trick? Keep experimenting. Curiosity beats talent.';
          case 2: return 'Then enjoy the tour. SCI-HIGH has surprises everywhere!';
          default: return 'Catch you later!';
        }
      }
    };
  }
}
