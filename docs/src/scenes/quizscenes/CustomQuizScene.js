
import Phaser from 'phaser';

/**
 * CustomQuizScene (Standalone)
 * Fully self-contained quiz scene (no BaseQuizScene dependency).
 * Provides minimal multiple-choice quiz flow with a static sample set unless provided via data.questions.
 */
export default class CustomQuizScene extends Phaser.Scene {
  constructor(){
    super({ key:'CustomQuizScene' });
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.isQuizStarted = false;
    this.score = 0;
  }

  init(data){
    this.topic = data?.topic || 'Custom';
    this.difficulty = data?.difficulty || 'medium';
    this.questions = Array.isArray(data?.questions) && data.questions.length ? data.questions.map(q=>({...q})) : this.defaultSampleQuestions();
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.isQuizStarted = false;
  }

  preload(){
    // Load font if needed (kept minimal – assets can be added later)
    this.load.font('Caprasimo-Regular', 'assets/font/Caprasimo-Regular.ttf');
  }

  create(){
    if(this.cameras?.main){ this.cameras.main.setBackgroundColor('#142 twelve'); }
    this.startQuiz();
    this.input.keyboard.on('keydown-ESC', ()=> this.scene.start('MainHub'));
  }

  defaultSampleQuestions(){
    return [
      { question:'2 + 2 = ?', options:['3','4','5','22'], correctIndex:1 },
      { question:'Capital of Japan?', options:['Seoul','Tokyo','Kyoto','Beijing'], correctIndex:1 },
      { question:'HTML stands for?', options:['Hyper Trainer Marking Language','HyperText Markup Language','Hyperloop Text Main Line','Home Tool Markup Language'], correctIndex:1 }
    ];
  }

  startQuiz(){
    if(this.isQuizStarted) return;
    this.isQuizStarted = true;
    this.showQuestion();
  }

  showQuestion(){
    if(this.currentQuestionIndex >= this.questions.length){
      this.showCompletion();
      return;
    }
    const q = this.questions[this.currentQuestionIndex];
    this.renderQuestion(q);
  }

  renderQuestion(q){
    if(this._container){ this._container.destroy(true); }
    const w = this.scale.width; const h = this.scale.height;
    const container = this.add.container(w/2, h/2);
    this._container = container;

    const boxW = Math.min(620, w - 40); const boxH = 300;
    const bg = this.add.rectangle(0,0,boxW,boxH,0x1f2f3d,0.92).setOrigin(0.5).setStrokeStyle(3,0x0d141a);
    container.add(bg);

    const title = this.add.text(0,-boxH/2 + 24,q.question,{
      fontFamily:'Caprasimo-Regular',fontSize:'28px',color:'#ffffff',stroke:'#000',strokeThickness:6,align:'center',wordWrap:{width:boxW-60}
    }).setOrigin(0.5,0);
    container.add(title);

    const opts = q.options || [];
    const startY = -60; const gap = 48;
    opts.forEach((opt,i)=>{
      const optBg = this.add.rectangle(0,startY + i*gap, boxW-80, 40, 0x274358, 0.85).setOrigin(0.5).setStrokeStyle(2,0x0b1e27);
      const txt = this.add.text(0,startY + i*gap,opt,{fontFamily:'Caprasimo-Regular',fontSize:'20px',color:'#ffd54f',stroke:'#000',strokeThickness:4}).setOrigin(0.5);
      optBg.setInteractive({useHandCursor:true}).on('pointerup',()=> this.handleAnswer(i));
      txt.setInteractive({useHandCursor:true}).on('pointerup',()=> this.handleAnswer(i));
      container.add(optBg); container.add(txt);
    });

    // Score display (top-left corner of scene, persistent style)
    if(!this._scoreText){
      this._scoreText = this.add.text(16,16,'Score: 0',{fontFamily:'Caprasimo-Regular',fontSize:'22px',color:'#ffffff',stroke:'#000',strokeThickness:5}).setOrigin(0,0).setDepth(100);
    }
  }

  handleAnswer(index){
    const q = this.questions[this.currentQuestionIndex];
    if(index === (q.correctIndex ?? 0)){
      this.score += 1;
      if(window?.pushGameMessage){
        window.pushGameMessage('Correct','Nice!');
      }
    } else {
      if(window?.pushGameMessage){
        window.pushGameMessage('Incorrect','Try the next one');
      }
    }
    this.currentQuestionIndex++;
    this._scoreText?.setText(`Score: ${this.score}`);
    this.time.delayedCall(350, ()=> this.showQuestion());
  }

  showCompletion(){
    if(this._container){ this._container.destroy(true); }
    const w = this.scale.width; const h = this.scale.height;
    this.add.text(w/2,h/2,`Quiz Complete!\nScore: ${this.score}/${this.questions.length}`,{fontFamily:'Caprasimo-Regular',fontSize:'30px',color:'#00ff99',stroke:'#000',strokeThickness:6,align:'center'}).setOrigin(0.5);
    this.add.text(w/2,h/2 + 120,'Press ESC to return',{fontFamily:'Caprasimo-Regular',fontSize:'18px',color:'#ffd54f',stroke:'#000',strokeThickness:4}).setOrigin(0.5);
  }
}
