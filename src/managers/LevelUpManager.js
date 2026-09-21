import { getLevelUpChoices } from "../progression/LevelUpUpgrades.js";
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

    const centerX = scene.scale.width / 2;
    const centerY = scene.scale.height / 2;

    const background = scene.add.rectangle(
      centerX,
      centerY,
      700,
      500,
      0x111111,
      0.95
    );

    background.setDepth(1000);

    this.objects.push(background);

    const title = scene.add.text(
      centerX,
      centerY - 200,
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
      centerX,
      centerY - 145,
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

    const cardLayout = this.getCardLayout(this.choices.length);
    
    this.choices.forEach((choice, index) => {
      const layout = cardLayout[index];

      const x = layout.x;
      const y = layout.y;

      const card = scene.add.rectangle(
        x,
        y,
        layout.width,
        layout.height,
        0x444444,
        1,
      );

      card.setDepth(1002);
      card.setStrokeStyle(3, 0xffffff);
      card.setInteractive({ useHandCursor: true });

      this.objects.push(card);

      const choiceTier = scene.add.text(
        x, 
        y - layout.height * 0.40,
        choice.tierLabel,
        {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          fill: '#cccccc',
        }
      ).setOrigin(0.5);

      choiceTier.setDepth(1003);
      this.objects.push(choiceTier);

      const choiceTitle = scene.add.text(
        x,
        y - layout.height * 0.22,
        choice.title,
        {
          fontFamily: 'sans-serif',
          fontSize: '20px',
          fill: '#ffffff',
          align: 'center',
          wordWrap: { width: layout.width - 30}
        }
      ).setOrigin(0.5);

      choiceTitle.setDepth(1003);
      this.objects.push(choiceTitle);

      const choiceDescription = scene.add.text(
        x,
        y + layout.height * 0.12,
        choice.description,
        {
          fontFamily: 'sans-serif',
          fontSize: '16px',
          fill: '#ffffff',
          align: 'center',
          wordWrap: { width: layout.width - 30 }
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
    return getLevelUpChoices(this.scene.player, 5);
  }

  selectChoice(choice) {
    
    console.log(
      'Level-up choice: ',
      choice.title,
      choice.tierLabel,
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

  getCardLayout(count) {
    const panelWidth = 700;

    const panelCenterX = this.scene.scale.width / 2;
    const panelCenterY = this.scene.scale.height / 2;

    const horizontalPadding = 40;

    const preferredCardWidth = 180;
    const minCardWidth = 120;

    const preferredGap = 20;
    const rowGap = 20;
    
    let columns;

    if (count <= 4) 
      columns = count;
    else if (count <= 6) 
      columns = 3;
    else 
      columns = 4;

    const rows = Math.ceil(count / columns);

    const availableWidth = panelWidth - horizontalPadding * 2;

    let gap = preferredGap;

    let cardWidth = (availableWidth - gap * (columns - 1)) / columns;

    cardWidth = Math.min(cardWidth, preferredCardWidth);

    if (cardWidth < minCardWidth) {
      gap = 12;

      cardWidth = (availableWidth - gap * (columns - 1)) / columns;
    }

    const cardHeight = rows === 1 ? 220 : 180;

    const gridCenterY = panelCenterY - 60 + (rows - 1) * 90;

    const totalGridHeight = rows * cardHeight + (rows - 1) * rowGap;

    const gridTop = gridCenterY - totalGridHeight / 2;

    const positions = [];

    for (let row = 0; row < rows; row++) {
      const firstIndex = row * columns;

      const itemsInRow = Math.min(columns, count - firstIndex);

      const rowWidth = itemsInRow * cardWidth + (itemsInRow - 1) * gap;

      const rowStartX = panelCenterX - rowWidth / 2 + cardWidth / 2;

      const y = gridTop + cardHeight / 2 + row * (cardHeight + rowGap);

      for (let column = 0; column < itemsInRow; column ++) {
        positions.push({
          x: rowStartX + column * (cardWidth + gap),
          y,
          width: cardWidth,
          height: cardHeight,
        });
      }
    }

    return positions;
  }

}