export default class UpgradeCard {
  constructor(scene, choice, x, y, width, height, onSelected) {
    this.scene = scene;
    this.choice = choice;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.onSelectedCallback = onSelected;

    this.glod = null;
    this.glowTween = null;

    this.selected = false;
    this.create();
  }

  create() {
    this.createBackground();
    this.createTier();
    this.createTitle();
    this.createDescription();

    this.setupInteraction();
  }

  createBackground() {
    const style = this.getTierStyle();

    if (this.choice.tier === 'rare' || this.choice.tier === 'veryRare') {
      this.glow = this.scene.add.rectangle(
        this.x, 
        this.y,
        this.width + 14,
        this.height + 14,
        0x000000,
        0
      );

      this.glow.setDepth(1001);

      this.glow.setStrokeStyle(
        this.choice.tier === 'veryRare' ? 8 : 6,
        style.strokeColor,
        0.20
      );

      this.glow.setAlpha(
        this.choice.tier === 'veryRare' ? 0.65 : 0,45
      );

      this.createGlowTween();
    }

    
    this.background = this.scene.add.rectangle(
      this.x,
      this.y,
      this.width,
      this.height,
      style.fillColor,
      1
    );

    this.background.setDepth(1002);
    this.background.setStrokeStyle(
      style.strokeWidth,
      style.strokeColor
    );
  }

  createGlowTween() {
    if (!this.glow) {
      return;
    }

    const isVeryRare = this.choice.tier === 'veryRare';

    this.glowTween = this.scene.tweens.add({
      targets: this.glow,

      alpha: {
        from: isVeryRare ? 0.45 : 0.30,
        to: isVeryRare ? 0.75 : 0.50,
      },

      scaleX: {
        from: 1.00,
        to: 1.015,
      },

      scaleY: {
        from: 1.00,
        to: 1.015,
      },

      duration: isVeryRare ? 900 : 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createTier() {
    this.tierText = this.scene.add.text(
      this.x,
      this.y - this.height * 0.40,
      this.choice.tierLabel,
      {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fill: this.getTierStyle().textColor,
        align: 'center'
      }
    ).setOrigin(0.5);

    this.tierText.setDepth(1003);
  }

  createTitle() {
    this.titleText = this.scene.add.text(
      this.x,
      this.y - this.height * 0.22,
      this.choice.title,
      {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        fill: '#ffffff',
        align: 'center',
        wordWrap: {
          width: this.width - 30,
        }
      }
    ).setOrigin(0.5);

    this.titleText.setDepth(1003);
  }

  createDescription() {
    this.descriptionText = this.scene.add.text(
      this.x,
      this.y + this.height * 0.12,
      this.choice.description,
      {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        fill: '#ffffff',
        align: 'center',
        wordWrap: {
          width: this.width - 30,
        }
      }
    ).setOrigin(0.5);

    this.descriptionText.setDepth(1003);
  }


  setupInteraction() {
    this.background.setInteractive({
      useHandCursor: true
    });

    this.background.on('pointerover', () => {
      this.onHover();
    });

    this.background.on('pointerout', () => {
      this.onHoverOut();
    });

    this.background.on('pointerup', () => {
      this.onSelected();
    });
  }


  onHover() {
    if (this.selected) {
      return;
    }

    // if (this.glow) {
    //   this.scene.tweens.add({
    //     targets: this.glow,
    //     alpha: this.choice.tier === 'veryRare' ? 0.9 : 0.65,
    //     duration: 100,
    //   });
    // }

    this.scene.tweens.add({
      targets: [
        this.background,
        this.tierText,
        this.titleText,
        this.descriptionText,
      ],
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 100,
      ease: 'Quad.easeOut'
    });

    this.background.setFillStyle(
      this.getTierStyle().hoverColor
    );
  }

  onHoverOut() {
    if (this.selected) {
      return;
    }

    // if (this.glow) {
    //   this.scene.tweens.add({
    //     targets: this.glow,
    //     alpha: this.choice.tier === 'veryRare' ? 0.45 : 0.30,
    //     duration: 150,
    //   });
    // }

    this.scene.tweens.add({
      targets: [
        this.background,
        this.tierText,
        this.titleText,
        this.descriptionText,
      ],
      scaleX: 1,
      scaleY: 1,
      duration: 100,
      ease: 'Quad.easeOut',
    });

    this.background.setFillStyle(
      this.getTierStyle().fillColor
    );
  }

  onSelected() {
    if (this.selected) {
      return;
    }
    this.selected = true;

    

    if (this.onSelectedCallback) {
      this.onSelectedCallback();
    }
  }

  animateSelected() {
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
    }

    const targets = [
      this.background,
      this.tierText,
      this.titleText,
      this.descriptionText,
    ];

    if (this.glow) {
      targets.push(this.glow);
    }

    this.scene.tweens.add({
      targets,
      scaleX: 1.08,
      scaleY: 1.08,
      alpha: 1,
      duration: 280,
      ease: 'Back.easeOut'
    });

    if (this.glow) {
      this.scene.tweens.add({
        targets: this.glow,
        alpha: 0.85,
        scaleX: 1.10,
        scaleY: 1.10,
        duration: 280,
        ease: 'Quad.easeOut'
      });
    }
  }

  animateDeselected() {
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
    }

    const targets = [
      this.background,
      this.tierText,
      this.titleText,
      this.descriptionText,
    ];

    this.scene.tweens.add({
      targets,
      scalseX: 0.92,
      scaleY: 0.92,
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeIn',
    });
  }

  getTierStyle() {
    switch(this.choice.tier) {
      case 'veryRare' : 
        return {
          fillColor: 0x4a4058,
          hoverColor: 0x665477,
          strokeColor: 0xffd86b,
          strokeWidth: 3,
          textColor: '#ffe7a3',
        };
      
      case 'rare': 
        return {
          fillColor: 0x44444f,
          hoverColor: 0x5a5a6a,
          strokeColor: 0xb9a7ff,
          strokeWidth: 3,
          textColor: '#d8ceff'
        };
      
      case 'uncommon':
        return {
          fillColor: 0x444444,
          hoverColor: 0x555555,
          strokeColor: 0x82d99a,
          strokeWidth: 2,
          textColor: '#a9efbb'
        };

      case 'common':
      default:
        return {
          fillColor: 0x444444,
          hoverColor: 0x555555,
          strokeColor: 0xffffff,
          strokeWidth: 2,
          textColor: '#cccccc'
        };  
    }
  }

  destroy() {
    const targets = [
      this.background,
      this.tierText,
      this.titleText,
      this.descriptionText,
    ];

    if (this.glow) {
      targets.push(this.glow);
    }

    this.scene.tweens.killTweensOf(targets);

    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
    }

    if (this.glow) {
      this.glow.destroy();
      this.glow = null;
    }

    this.background.destroy();
    this.tierText.destroy();
    this.titleText.destroy();
    this.descriptionText.destroy();
  }

}