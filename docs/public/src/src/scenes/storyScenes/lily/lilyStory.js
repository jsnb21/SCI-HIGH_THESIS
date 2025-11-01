import BaseCharacterStoryScene from '../_base/BaseCharacterStoryScene.js';

export default class LilyStory extends BaseCharacterStoryScene {
  constructor(){
    super('LilyStory');
  }

  getConfig(){
    return {
      key: 'LilyStory',
      portraitKey: 'LilyPortrait',
      portraitPath: 'assets/sprites/npcs/Lily.png',
      backgroundColor: '#f0c0d0',
      openingLine: 'How are you?',
      choices: [
        "Just want to see how you're doing",
        "I want to know more about SCI-HIGH",
        "Nothing. Just Checking on you."
      ],
      responses: (index, text) => {
        switch(index){
          case 0: return "That's so sweet of you! I'm doing great, thank you for asking.";
          case 1: return "SCI-HIGH is an amazing place! There's so much to discover here. I'd love to show you around sometime.";
          case 2: return "Aww, that's really thoughtful of you. I appreciate you checking up on me!";
          default: return "Thanks for talking with me!";
        }
      }
    };
  }
}
