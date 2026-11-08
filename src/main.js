import { GameScene } from "./GameScene.js";

const fullscreenTarget = document.getElementById("game-shell");

const config = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: 1280,
  height: 720,
  backgroundColor: "#171923",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget,
  },
  physics: {
    default: "matter",
    matter: {
      gravity: { y: 0 },
      debug: {
        showBody: true,
        showStaticBody: true,
      },
    },
  },
  scene: GameScene,
};

const game = new Phaser.Game(config);
const fullscreenButton = document.getElementById("fullscreen-toggle");

fullscreenButton?.addEventListener("click", () => {
  if (game.scale.isFullscreen) {
    game.scale.stopFullscreen();
  } else {
    game.scale.startFullscreen();
  }
});

game.scale.on("enterfullscreen", () => {
  if (fullscreenButton) fullscreenButton.textContent = "Exit fullscreen";
});

game.scale.on("leavefullscreen", () => {
  if (fullscreenButton) fullscreenButton.textContent = "Fullscreen";
});
