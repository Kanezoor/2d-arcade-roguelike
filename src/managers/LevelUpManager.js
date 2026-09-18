export default class LevelUpManager {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.choices = [];

    this.isOpen = false;
    this.waitForPointerRelease = false;
  }
  
  show() {
    if (this.isOpen) {
      return;
    }

    this.isOpen = true;

    this.scene.isLevelUpOpen = true;
    this.scene.matter.world.pause();

    this.waitForPointerRelease = this.scene.input.activePointer.isDown;

    if (this.waitForPointerRelease) {
      this.scene.input.once('pointerup', () => {
        this.scene.time.delayedCall(0, () => {
          this.waitForPointerRelease = false;
        });
      });
    }

    this.createUI();
  }

  createUI() {
    const scene = this.scene;

    const background = scene.add.rectangle(
      400,
      300,
      700,
      500,
      0x111111,
      0.95
    );

    background.setDepth(1000);

    this.objects.push(background);

    const title = scene.add.text(
      400,
      100,
      `LEVEL ${scene.player.level}`,
      {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        fill: '#ffffff'
      }
    ).setOrigin(0.5);

    title.setDepth(1001);

    this.objects.push(title);

    const subtitle = scene.add.text(
      400,
      155,
      'Choose an upgrade',
      {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        fill: '#ffffff'
      }
    ).setOrigin(0.5);

    subtitle.setDepth(1001);
    this.objects.push(subtitle);

    this.choices = this.buildChoices();

    const startX = 295;
    const gap = 210;

    this.choices.forEach((choice, index) => {
      const x = startX + gap * index;

      const card = scene.add.rectangle(
        x,
        320,
        180,
        220,
        0x444444,
        1
      );

      card.setDepth(1002);
      card.setStrokeStyle(3, 0xffffff);
      card.setInteractive({ useHandCursor: true });

      this.objects.push(card);

      const choiceTitle = scene.add.text(
        x,
        255,
        choice.title,
        {
          fontFamily: 'sans-serif',
          fontSize: '20px',
          fill: '#ffffff',
          align: 'center',
          wordWrap: { width: 150}
        }
      ).setOrigin(0.5);

      choiceTitle.setDepth(1003);
      this.objects.push(choiceTitle);

      const choiceDescription = scene.add.text(
        x,
        345,
        choice.description,
        {
          fontFamily: 'sans-serif',
          fontSize: '16px',
          fill: '#ffffff',
          align: 'center',
          wordWrap: { width: 150 }
        }
      ).setOrigin(0.5);

      choiceDescription.setDepth(1003);
      this.objects.push(choiceDescription);

      card.on('pointerover', () => {
        card.setFillStyle(0x666666);
      });

      card.on('pointerout', () => {
        card.setFillStyle(0x444444);
      });

      card.on('pointerup', () => {
        if (this.waitForPointerRelease) {
          return;
        }

        this.selectChoice(choice);
      });
    });
  }

  buildChoices() {
    return [
      {
        id: 'maxHealth',
        title: 'Max Health',
        description: '+15 maximum health.',
        apply: player => {
          player.maxHealth += 15;
        }
      },
      {
        id: 'heal',
        title: 'Heal',
        description: 'Restore 25 health',
        apply: player => {
          player.health = Math.min(
            player.health + 25,
            player.maxHealth
          );
        }
      },
      {
        id: 'knockbackResistance',
        title: 'Steadfast',
        description: 'Reduce incoming knockback by 10%.',
        apply: player => {
          player.increaseKnockbackResistance(0.1);
        }
      }
    ];
  }

  selectChoice(choice) {
    
    console.log(
      'Level-up choice: ',
      choice.title
    );

    choice.apply(this.scene.player);

    this.close();

    this.scene.time.delayedCall(0, () => {
      this.scene.player.completeLevelUp();
    });
  }

  close() {
    if (!this.isOpen) {
      return;
    }

    this.objects.forEach(object => {
      if (object) {
        object.destroy();
      }
    });

    this.objects = [];
    this.choices = [];
    this.isOpen = false;
    this.waitForPointerRelease = false;
    this.scene.isLevelUpOpen = false;
    this.scene.matter.world.resume();
  }
}