import Phaser from 'phaser';
// Reusable styled modal identical to Data Privacy Notice look & feel
// Usage: import { showStyledModal } from '../ui/StyledModal.js';
// showStyledModal(this, { title: 'My Title', body: 'Body text', confirmText: 'OK', showCheckbox: true, checkboxLabel: "Don't show again", onConfirm: (checked)=>{}, widthMax:960 });

export function showStyledModal(scene, options = {}) {
    const {
        title = 'Notice',
        body = '',
        confirmText = 'OK',
        showCheckbox = false,
        checkboxLabel = "Don't show again",
        defaultChecked = false,
        onConfirm = () => {},
        onClose = null,
        widthMax = 960,
        heightMax = 640,
        fontSizeBody = 24,
        overlayAlpha = 0.55,
        panelRatioW = 0.94,
        panelRatioH = 0.86,
        yOffset = 0,
        buttonWidth = 260
    } = options;

    const { width, height } = scene.scale;
    const isMobile = width < 768;

    const overlay = scene.add.rectangle(width/2, height/2, width, height, 0x000000, overlayAlpha)
        .setOrigin(0.5).setAlpha(0);

    const panelWidth = Math.min(width * panelRatioW, widthMax);
    const panelHeight = Math.min(height * panelRatioH, heightMax);
    const panelX = width / 2;
    const panelY = height / 2 + yOffset;

    const panel = scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x0f1524, 0.95)
        .setStrokeStyle(3, 0xffdd33, 1)
        .setOrigin(0.5)
        .setAlpha(0);

    const headerHeight = 68;
    const headerBar = scene.add.rectangle(panelX, panelY - panelHeight/2 + headerHeight/2, panelWidth, headerHeight, 0x121d31, 1)
        .setOrigin(0.5)
        .setAlpha(0);

    const iconRadius = 22;
    const iconX = panelX - panelWidth/2 + 28 + iconRadius;
    const iconY = headerBar.y;
    const iconCircle = scene.add.circle(iconX, iconY, iconRadius, 0xffcc18, 1).setAlpha(0);
    const iconText = scene.add.text(iconX, iconY, '⚠', { fontFamily:'Arial', fontSize: (isMobile? 28:30) + 'px', color:'#222222'}).setOrigin(0.5).setAlpha(0);

    const titleFontSize = isMobile ? 26 : 28;
    const titleText = scene.add.text(iconX + iconRadius + 18, iconY, title, {
        fontFamily: 'Arial Black, Arial',
        fontSize: titleFontSize + 'px',
        color: '#ffffff'
    }).setOrigin(0,0.5).setAlpha(0);

    // Body
    const bodyPaddingX = 48;
    const bodyPaddingTop = 28;
    const bodyAreaWidth = panelWidth - bodyPaddingX*2;
    const bodyStartY = headerBar.y + headerHeight/2 + bodyPaddingTop;
    const bodyText = scene.add.text(panelX, bodyStartY, body, {
        fontFamily: 'Arial',
        fontSize: fontSizeBody + 'px',
        color: '#dbe3f2',
        align: 'left',
        wordWrap: { width: bodyAreaWidth },
        lineSpacing: 10
    }).setOrigin(0.5,0).setAlpha(0);

    const availableBodyHeight = panelHeight - headerHeight - 160;
    const needsScroll = bodyText.height > availableBodyHeight;
    let bodyMaskShape = null;
    if (needsScroll) {
        bodyMaskShape = scene.add.rectangle(panelX, bodyStartY + availableBodyHeight/2, bodyAreaWidth, availableBodyHeight, 0xffffff, 0)
            .setOrigin(0.5);
        bodyText.setY(bodyStartY);
        bodyText.setMask(bodyMaskShape.createBitmapMask());
        scene.input.on('wheel', (pointer, over, dx, dy) => {
            if (done) return;
            const delta = dy * 0.5;
            bodyText.y = Phaser.Math.Clamp(bodyText.y - delta, bodyStartY - (bodyText.height - availableBodyHeight), bodyStartY);
        });
        let dragStartY = 0;
        let contentStartY = 0;
        bodyText.setInteractive();
        bodyText.on('pointerdown', (p) => { dragStartY = p.position.y; contentStartY = bodyText.y; });
        bodyText.on('pointermove', (p) => {
            if (!p.isDown) return;
            const diff = p.position.y - dragStartY;
            bodyText.y = Phaser.Math.Clamp(contentStartY + diff, bodyStartY - (bodyText.height - availableBodyHeight), bodyStartY);
        });
    }

    // Button
    const buttonsY = panelY + panelHeight/2 - (isMobile? 112:104);
    const btnH = isMobile? 60:56;
    const yesBtnRect = scene.add.rectangle(panelX, buttonsY, buttonWidth, btnH, 0xffdd33, 1)
        .setOrigin(0.5).setAlpha(0).setInteractive({useHandCursor:true});
    yesBtnRect.setStrokeStyle(2, 0xffe572, 1);
    const yesBtnTxt = scene.add.text(panelX, buttonsY, confirmText, {
        fontFamily:'Arial',
        fontSize:(isMobile?22:20)+'px',
        fontStyle:'bold',
        color:'#1a1f29'
    }).setOrigin(0.5).setAlpha(0);
    yesBtnRect.on('pointerover',()=> yesBtnRect.setFillStyle(0xffe04a));
    yesBtnRect.on('pointerout',()=> yesBtnRect.setFillStyle(0xffdd33));

    // Checkbox (optional)
    let cbRect = null, cbMark = null, cbLabelText = null, cbChecked = !!defaultChecked;
    if (showCheckbox) {
        const checkboxY = buttonsY + (isMobile ? 60 : 56);
        const boxSize = 28;
        const totalCheckboxWidth = boxSize + 12 + 200;
        const cbX = panelX - totalCheckboxWidth/2 + boxSize/2 + 10; // matches current privacy layout
        cbRect = scene.add.rectangle(cbX, checkboxY, boxSize, boxSize, 0x1d2a3b, 1)
            .setStrokeStyle(2, 0xffdd33, 1).setOrigin(0.5).setAlpha(0).setInteractive({useHandCursor:true});
        cbMark = scene.add.text(cbX, checkboxY, cbChecked ? '✓' : '', {fontFamily:'Arial Black', fontSize: (boxSize-6)+'px', color:'#ffdd33'}).setOrigin(0.5).setAlpha(0);
        cbLabelText = scene.add.text(cbX + boxSize/2 + 12, checkboxY, checkboxLabel, {fontFamily:'Arial', fontSize:(isMobile?18:17)+'px', color:'#dbe3f2'}).setOrigin(0,0.5).setAlpha(0).setInteractive();
        const toggleCb = () => {
            cbChecked = !cbChecked;
            cbMark.setText(cbChecked ? '✓' : '');
            try { scene.sound.play('se_select',{volume:0.6}); } catch {}
        };
        cbRect.on('pointerdown', toggleCb);
        cbLabelText.on('pointerdown', toggleCb);
    }

    const elements = [overlay, panel, headerBar, iconCircle, iconText, titleText, bodyText, yesBtnRect, yesBtnTxt];
    if (cbRect) elements.push(cbRect, cbMark, cbLabelText);
    if (bodyMaskShape) elements.push(bodyMaskShape);

    let done = false;
    const cleanup = () => {
        elements.forEach(e=>{ if (e && e.destroy) e.destroy(); });
        if (onClose) onClose();
    };

    const proceed = () => {
        if (done) return; done = true;
        scene.tweens.add({
            targets: elements,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => {
                cleanup();
                try { onConfirm(cbChecked); } catch {}
            }
        });
    };

    yesBtnRect.on('pointerdown', () => {
        try { scene.sound.play('se_select',{volume:0.7}); } catch {}
        scene.tweens.add({ targets:[yesBtnRect, yesBtnTxt], scaleX:0.94, scaleY:0.94, duration:110, yoyo:true, ease:'Power2', onComplete:proceed });
    });

    // Intro animation
    scene.tweens.add({ targets: overlay, alpha:overlayAlpha, duration:260, ease:'Power2' });
    scene.tweens.add({ targets: panel, alpha:1, duration:320, ease:'Back.Out' });
    scene.tweens.add({ targets: [headerBar, iconCircle, iconText, titleText], alpha:1, duration:380, ease:'Power2', delay:140 });
    scene.tweens.add({ targets: bodyText, alpha:1, duration:420, ease:'Power2', delay:260 });
    if (cbRect) scene.tweens.add({ targets: [cbRect, cbMark, cbLabelText], alpha:1, duration:420, ease:'Power2', delay:360 });
    scene.tweens.add({ targets: [yesBtnRect, yesBtnTxt], alpha:1, duration:420, ease:'Power2', delay:460 });

    return {
        destroy: proceed,
        get checked() { return cbChecked; },
        elements
    };
}

// Confirm-style modal (OK + Cancel) that returns a Promise<boolean>
// Usage: const ok = await showStyledConfirm(this, { title:'Open Book?', body:'Open "X" in a new tab?', confirmText:'Open', cancelText:'Cancel' });
export function showStyledConfirm(scene, options = {}) {
    const {
        title = 'Confirm',
        body = '',
        confirmText = 'OK',
        cancelText = 'Cancel',
        widthMax = 640,
        heightMax = 360,
        fontSizeBody = 24,
        overlayAlpha = 0.6,
        panelRatioW = 0.9,
        panelRatioH = 0.6,
        buttonWidth = 180,
        buttonSpacing = 34
    } = options;

    const { width, height } = scene.scale;
    const isMobile = width < 768;

    const overlay = scene.add.rectangle(width/2, height/2, width, height, 0x000000, overlayAlpha)
        .setOrigin(0.5).setAlpha(0);

    const panelWidth = Math.min(width * panelRatioW, widthMax);
    const panelHeight = Math.min(height * panelRatioH, heightMax);
    const panelX = width / 2;
    const panelY = height / 2;

    const panel = scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x0f1524, 0.95)
        .setStrokeStyle(3, 0xffdd33, 1)
        .setOrigin(0.5)
        .setAlpha(0);

    const headerHeight = 60;
    const headerBar = scene.add.rectangle(panelX, panelY - panelHeight/2 + headerHeight/2, panelWidth, headerHeight, 0x121d31, 1)
        .setOrigin(0.5)
        .setAlpha(0);

    const iconRadius = 20;
    const iconX = panelX - panelWidth/2 + 24 + iconRadius;
    const iconY = headerBar.y;
    const iconCircle = scene.add.circle(iconX, iconY, iconRadius, 0xffcc18, 1).setAlpha(0);
    const iconText = scene.add.text(iconX, iconY, '📖', { fontFamily:'Arial', fontSize: (isMobile? 26:28) + 'px', color:'#222222'}).setOrigin(0.5).setAlpha(0);

    const titleFontSize = isMobile ? 24 : 26;
    const titleText = scene.add.text(iconX + iconRadius + 16, iconY, title, {
        fontFamily: 'Arial Black, Arial',
        fontSize: titleFontSize + 'px',
        color: '#ffffff'
    }).setOrigin(0,0.5).setAlpha(0);

    const bodyPaddingX = 36;
    const bodyPaddingTop = 18;
    const bodyAreaWidth = panelWidth - bodyPaddingX*2;
    const bodyStartY = headerBar.y + headerHeight/2 + bodyPaddingTop;
    const bodyText = scene.add.text(panelX, bodyStartY, body, {
        fontFamily: 'Arial',
        fontSize: fontSizeBody + 'px',
        color: '#dbe3f2',
        align: 'center',
        wordWrap: { width: bodyAreaWidth },
        lineSpacing: 6
    }).setOrigin(0.5,0).setAlpha(0);

    const buttonsY = panelY + panelHeight/2 - (isMobile? 78:70);
    const btnH = isMobile? 54:50;
    const okX = panelX - (buttonWidth/2 + buttonSpacing/2);
    const cancelX = panelX + (buttonWidth/2 + buttonSpacing/2);

    const makeButton = (x,y,w,h,color,label,isPrimary=false) => {
        const rect = scene.add.rectangle(x,y,w,h,color,1).setOrigin(0.5).setAlpha(0).setInteractive({useHandCursor:true});
        rect.setStrokeStyle(2, isPrimary? 0xffe572 : 0x596276, 1);
        const txt = scene.add.text(x,y,label,{
            fontFamily:'Arial',
            fontSize:(isMobile?22:20)+'px',
            fontStyle:'bold',
            color: isPrimary? '#1a1f29':'#ffffff'
        }).setOrigin(0.5).setAlpha(0);
        rect.on('pointerover',()=> rect.setFillStyle(isPrimary?0xffe04a:0x4a566b));
        rect.on('pointerout',()=> rect.setFillStyle(color));
        return {rect, txt};
    };

    const okBtn = makeButton(okX, buttonsY, buttonWidth, btnH, 0xffdd33, confirmText, true);
    const cancelBtn = makeButton(cancelX, buttonsY, buttonWidth, btnH, 0x1d2a3b, cancelText, false);

    const elements = [overlay, panel, headerBar, iconCircle, iconText, titleText, bodyText, okBtn.rect, okBtn.txt, cancelBtn.rect, cancelBtn.txt];
    let done = false;
    const cleanup = () => { elements.forEach(e=>{ if (e && e.destroy) e.destroy(); }); };

    // Animations
    scene.tweens.add({ targets: overlay, alpha:overlayAlpha, duration:240, ease:'Power2' });
    scene.tweens.add({ targets: panel, alpha:1, duration:300, ease:'Back.Out' });
    scene.tweens.add({ targets: [headerBar, iconCircle, iconText, titleText], alpha:1, duration:340, ease:'Power2', delay:110 });
    scene.tweens.add({ targets: bodyText, alpha:1, duration:380, ease:'Power2', delay:200 });
    scene.tweens.add({ targets: [okBtn.rect, okBtn.txt, cancelBtn.rect, cancelBtn.txt], alpha:1, duration:420, ease:'Power2', delay:300 });

    return new Promise(resolve => {
        const accept = () => {
            if (done) return; done = true;
            scene.tweens.add({ targets: elements, alpha:0, duration:320, ease:'Power2', onComplete:() => { cleanup(); resolve(true); } });
        };
        const decline = () => {
            if (done) return; done = true;
            scene.tweens.add({ targets: elements, alpha:0, duration:250, ease:'Power2', onComplete:() => { cleanup(); resolve(false); } });
        };
        okBtn.rect.on('pointerdown', () => {
            scene.tweens.add({ targets:[okBtn.rect, okBtn.txt], scaleX:0.94, scaleY:0.94, duration:110, yoyo:true, ease:'Power2', onComplete: accept });
        });
        cancelBtn.rect.on('pointerdown', () => {
            scene.tweens.add({ targets:[cancelBtn.rect, cancelBtn.txt], scaleX:0.94, scaleY:0.94, duration:110, yoyo:true, ease:'Power2', onComplete: decline });
        });
        // Keyboard shortcuts
        const esc = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        const enter = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        const onEsc = () => decline();
        const onEnter = () => accept();
        esc?.once('down', onEsc);
        enter?.once('down', onEnter);
        overlay.once('pointerdown', onEsc);
    });
}
