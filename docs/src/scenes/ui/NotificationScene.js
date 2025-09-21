import Phaser from 'phaser';

// NotificationScene: Renders queued popups (achievements + generic notify) inside the Phaser canvas.
export default class NotificationScene extends Phaser.Scene {
  constructor(){
    super({ key:'NotificationScene', active:true });
    this.queue = [];
    this.activeItem = null;
    this.achievementToasts = [];
  }
  create(){
    this.layer = this.add.layer();
    this.layer.setDepth(9999);
    window.__phaserNotificationsReady = true;
    // Single bringToTop to ensure layering (no repeated debug retries)
    try { this.scene.bringToTop(); } catch(_) {}

    // Flush any buffered notifications queued before readiness
    if(Array.isArray(window.__pendingGameNotifications) && window.__pendingGameNotifications.length){
      const pending = window.__pendingGameNotifications.splice(0);
      pending.forEach(p=> this.enqueue(p));
    }

    this.game.events.on('achievement-unlocked', data => {
      this.showAchievementToast({
        title: data?.title || 'Unknown Achievement',
        rarity: data?.rarity || 'Common'
      });
    });
    this.game.events.on('notify', data => {
      this.enqueue({
        title:data?.title || 'Notification',
        message:data?.message || '',
        type:data?.type || 'info'
      });
    });

  }
  enqueue(item){ this.queue.push(item); if(!this.activeItem) this.showNext(); }
  rarityColor(r){ return ({Epic:0x9b59b6,Rare:0x2980b9,Uncommon:0x27ae60,Common:0x95a5a6})[r]||0x2c3e50; }
  showNext(){
    if(this.activeItem || !this.queue.length) return;
    const data = this.queue.shift();
    this.activeItem = data;
    const padding=20, maxWidth=560;
    const cam=this.cameras.main;
    const x=cam.midPoint.x; const y=cam.worldView.y+140;
    const title = this.add.text(0,0,data.title,{fontFamily:'Caprasimo-Regular',fontSize:'34px',color:'#fff',stroke:'#000',strokeThickness:6}).setOrigin(0.5,0);
    const msg = this.add.text(0,0,data.message,{fontFamily:'Caprasimo-Regular',fontSize:'26px',color:'#fff',wordWrap:{width:maxWidth-padding*2}}).setOrigin(0.5,0);
    msg.y = title.height + 6;
    const contentH = title.height + 6 + msg.height;
    const contentW = Math.min(maxWidth, Math.max(title.width,msg.width)+padding*2);
    const container = this.add.container(x,-400).setDepth(100000);
    const bg = this.add.graphics();
    bg.fillStyle(data.type==='achievement'? this.rarityColor(data.rarity):0x2c3e50,0.92);
    bg.fillRoundedRect(-contentW/2,-padding,contentW,contentH+padding*2,22);
    if(data.type==='achievement'){
      const accent=this.add.graphics();
      accent.fillStyle(0xffffff,0.28);
      accent.fillRoundedRect(-contentW/2,contentH+padding-18,contentW,14,{tl:0,tr:0,bl:22,br:22});
      container.add(accent);
    }
    container.add([bg,title,msg]);
    this.layer.add(container);
    this.tweens.add({targets:container,y,alpha:{from:0,to:1},duration:420,ease:'Cubic.easeOut',onComplete:()=>{
      this.time.delayedCall(2600,()=>this.dismiss(container));
    }});
  }
  dismiss(container){
    this.tweens.add({targets:container,y:-400,alpha:{from:1,to:0},duration:360,ease:'Cubic.easeIn',onComplete:()=>{
      container.destroy(true); this.activeItem=null; this.showNext();
    }});
  }

  // ================= Top-Right Achievement Toasts =================
  showAchievementToast({ title, rarity }){
    const cam = this.cameras.main;
    const margin = 30;
    const padding = 14;
    const maxWidth = 420;
    const baseX = cam.worldView.x + cam.worldView.width - margin; // right edge reference
    const baseY = cam.worldView.y + margin; // top edge reference

    // Create title + (rarity label)
    const header = this.add.text(0,0,'Achievement Unlocked!',{
      fontFamily:'Caprasimo-Regular',fontSize:'24px',color:'#fff',stroke:'#000',strokeThickness:4
    }).setOrigin(0,0);
    const name = this.add.text(0,0,title,{
      fontFamily:'Caprasimo-Regular',fontSize:'22px',color:'#fff',stroke:'#000',strokeThickness:3,wordWrap:{width:maxWidth-padding*2}
    }).setOrigin(0,0);
    name.y = header.height + 4;
    const totalH = header.height + 4 + name.height;
    const totalW = Math.min(maxWidth, Math.max(header.width,name.width) + padding*2);

    const container = this.add.container(baseX + totalW + 40, baseY) // start off-screen to right
      .setDepth(100050)
      .setAlpha(0);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(this.rarityColor(rarity), 0.95);
    bg.fillRoundedRect(0,0,totalW,totalH + padding*2,18);
    // Accent bar at bottom
    const accent = this.add.graphics();
    accent.fillStyle(0xffffff,0.25);
    accent.fillRoundedRect(0,totalH+padding*2-12,totalW,12,{ tl:0,tr:0,bl:18,br:18});

    // Position texts inside background
    header.x = padding; header.y = padding;
    name.x = padding; name.y = padding + header.height + 4;

    container.add([bg,accent,header,name]);
    this.layer.add(container);

    // Determine vertical stacking (shift existing down)
    const verticalGap = 12;
    let yOffset = 0;
    this.achievementToasts.forEach(t => {
      yOffset += t.height + verticalGap;
    });
    container.y = baseY + yOffset;
    container.widthVal = totalW; // store for reposition
    container.height = totalH + padding*2;

    // Slide & fade in
    this.tweens.add({
      targets: container,
      x: baseX - totalW, // final position (right-aligned)
      alpha: 1,
      duration: 420,
      ease: 'Cubic.easeOut'
    });

    // Auto dismiss after delay
    this.time.delayedCall(3600, () => this.dismissAchievementToast(container));

    this.achievementToasts.push(container);
  }

  dismissAchievementToast(container){
    if(!container || container._closing) return;
    container._closing = true;
    this.tweens.add({
      targets: container,
      x: container.x + 60,
      alpha: 0,
      duration: 320,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        const idx = this.achievementToasts.indexOf(container);
        if(idx>=0) this.achievementToasts.splice(idx,1);
        container.destroy(true);
        this.reflowAchievementToasts();
      }
    });
  }

  reflowAchievementToasts(){
    const cam = this.cameras.main;
    const margin = 30; const verticalGap = 12;
    const baseY = cam.worldView.y + margin;
    const baseX = cam.worldView.x + cam.worldView.width - margin;
    let yCursor = baseY;
    this.achievementToasts.forEach(t => {
      this.tweens.add({ targets:t, x: baseX - t.widthVal, y: yCursor, duration: 250, ease:'Cubic.easeOut'});
      yCursor += t.height + verticalGap;
    });
  }
}
