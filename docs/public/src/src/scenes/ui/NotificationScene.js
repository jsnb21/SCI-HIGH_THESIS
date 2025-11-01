import Phaser from 'phaser';

// NotificationScene: Renders queued popups (achievements + generic notify) inside the Phaser canvas.
export default class NotificationScene extends Phaser.Scene {
  constructor(){
    super({ key:'NotificationScene', active:true });
    this.queue = [];
    this.activeItem = null;
    this.achievementToasts = [];
    this.responsive = { }; // will be filled each frame / on resize
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

    // Initial responsive calculation
    this.computeResponsiveMetrics();
    // Listen to scale resize from Phaser
    this.scale.on('resize', () => this.handleResize());
    // Fallback listener (some environments dispatch window resize only)
    if(window){ window.addEventListener('resize', () => this.handleResize()); }

  }
  computeResponsiveMetrics(){
    const w = this.scale.gameSize.width;
    const isSmall = w < 540;
    const isTiny = w < 380;
    this.responsive = {
      isSmall,
      isTiny,
      queueMaxWidth: isTiny ? 260 : isSmall ? 380 : 560,
      queueTitleSize: isTiny ? 22 : isSmall ? 28 : 34,
      queueMsgSize: isTiny ? 16 : isSmall ? 20 : 26,
      queuePadding: isTiny ? 12 : isSmall ? 16 : 20,
      queueYOffset: isTiny ? 70 : isSmall ? 110 : 140,
      toastMaxWidth: isTiny ? 200 : isSmall ? 300 : 420,
      toastHeaderSize: isTiny ? 16 : isSmall ? 20 : 24,
      toastNameSize: isTiny ? 14 : isSmall ? 18 : 22,
      toastMargin: isTiny ? 12 : isSmall ? 20 : 30,
      toastPadding: isTiny ? 8 : isSmall ? 10 : 14,
      toastVerticalGap: isTiny ? 6 : isSmall ? 10 : 12,
      toastLifetime: 3600 // could shorten on tiny if desired
    };
  }
  handleResize(){
    this.computeResponsiveMetrics();
    // Reflow active center popup (if any)
    if(this.activeContainer && this.activeContainer.list){
      this.relayoutActiveCenter();
    }
    // Reflow achievement toasts
    this.reflowAchievementToasts(true);
  }
  enqueue(item){ this.queue.push(item); if(!this.activeItem) this.showNext(); }
  rarityColor(r){ return ({Epic:0x9b59b6,Rare:0x2980b9,Uncommon:0x27ae60,Common:0x95a5a6})[r]||0x2c3e50; }
  showNext(){
    if(this.activeItem || !this.queue.length) return;
    const data = this.queue.shift();
    this.activeItem = data;
    const { queuePadding:padding, queueMaxWidth:maxWidth, queueTitleSize, queueMsgSize, queueYOffset } = this.responsive;
    const cam=this.cameras.main;
    const x=cam.midPoint.x; const y=cam.worldView.y+queueYOffset;
    const title = this.add.text(0,0,data.title,{fontFamily:'Caprasimo-Regular',fontSize:`${queueTitleSize}px`,color:'#fff',stroke:'#000',strokeThickness:Math.round(queueTitleSize*0.18)}).setOrigin(0.5,0);
    const msg = this.add.text(0,0,data.message,{fontFamily:'Caprasimo-Regular',fontSize:`${queueMsgSize}px`,color:'#fff',wordWrap:{width:maxWidth-padding*2}}).setOrigin(0.5,0);
    msg.y = title.height + 6;
    const contentH = title.height + 6 + msg.height;
    const contentW = Math.min(maxWidth, Math.max(title.width,msg.width)+padding*2);
    const container = this.add.container(x,-400).setDepth(100000);
    this.activeContainer = container; // store for possible relayout
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
    const { toastMargin:margin, toastPadding:padding, toastMaxWidth:maxWidth, toastHeaderSize, toastNameSize, toastVerticalGap, toastLifetime } = this.responsive;
    const baseX = cam.worldView.x + cam.worldView.width - margin; // right edge reference
    const baseY = cam.worldView.y + margin; // top edge reference

    // Create title + (rarity label)
    const header = this.add.text(0,0,'Achievement Unlocked!',{
      fontFamily:'Caprasimo-Regular',fontSize:`${toastHeaderSize}px`,color:'#fff',stroke:'#000',strokeThickness:Math.round(toastHeaderSize*0.18)
    }).setOrigin(0,0);
    const name = this.add.text(0,0,title,{
      fontFamily:'Caprasimo-Regular',fontSize:`${toastNameSize}px`,color:'#fff',stroke:'#000',strokeThickness:Math.round(toastNameSize*0.17),wordWrap:{width:maxWidth-padding*2}
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
  const verticalGap = toastVerticalGap;
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
  this.time.delayedCall(toastLifetime, () => this.dismissAchievementToast(container));

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

  reflowAchievementToasts(resizing=false){
    const cam = this.cameras.main;
    const { toastMargin:margin, toastVerticalGap:verticalGap } = this.responsive;
    const baseY = cam.worldView.y + margin;
    const baseX = cam.worldView.x + cam.worldView.width - margin;
    let yCursor = baseY;
    this.achievementToasts.forEach(t => {
      const targetX = baseX - t.widthVal;
      if(resizing){
        // Jump faster during resize to avoid laggy feel
        this.tweens.add({ targets:t, x: targetX, y: yCursor, duration: 160, ease:'Cubic.easeOut'});
      } else {
        this.tweens.add({ targets:t, x: targetX, y: yCursor, duration: 250, ease:'Cubic.easeOut'});
      }
      yCursor += t.height + verticalGap;
    });
  }
  relayoutActiveCenter(){
    if(!this.activeContainer) return;
    // Destroy & rebuild? Simpler: we can't easily reflow text widths without recreating; so dismiss fast & requeue original data.
    // For smoothness: skip if currently animating in/out.
    if(this.activeItem){
      const current = this.activeItem;
      // Put it back at front of queue to rebuild with new metrics
      this.queue.unshift(current);
      // Force immediate dismiss of current visual container
      this.activeItem = null;
      try { this.activeContainer.destroy(true); } catch(_) {}
      this.activeContainer = null;
      this.showNext();
    }
  }
}
