const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#87CEEB',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 600 },
      debug: true,
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

const game = new Phaser.Game(config);

let ship;
let island;
let isDragging = false;
let characters = [];
let currentCharIndex = 0;

const charactersData = [
  { key: 'char1', weight: 1 },
  { key: 'char2', weight: 2 },
  { key: 'char3', weight: 3 },
  { key: 'char4', weight: 4 },
  { key: 'char5', weight: 5 },
  { key: 'char6', weight: 6 },
  { key: 'char7', weight: 7 },
  { key: 'char8', weight: 8 },
  { key: 'char9', weight: 9 },
  { key: 'char10', weight: 10 },
];