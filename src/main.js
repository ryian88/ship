const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#87CEEB",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 300 },
      debug: true, // 충돌박스 확인용
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
let isDragging = false;
let characters = [];
let ground;
let currentCharIndex = 0;

const charactersData = [
  { key: "char1", weight: 1 },
  { key: "char2", weight: 2 },
  { key: "char3", weight: 3 },
  { key: "char4", weight: 4 },
  { key: "char5", weight: 5 },
  { key: "char6", weight: 6 },
  { key: "char7", weight: 7 },
  { key: "char8", weight: 8 },
  { key: "char9", weight: 9 },
  { key: "char10", weight: 10 },
];

function preload() {
  this.load.image("bg", "assets/bg.png");
  this.load.image("ship", "assets/ship.png");
  this.load.image("char1", "assets/elephant.png");
  this.load.image("char2", "assets/giraffe.png");
  this.load.image("char3", "assets/hippo.png");
  this.load.image("char4", "assets/monkey.png");
  this.load.image("char5", "assets/panda.png");
  this.load.image("char6", "assets/parrot.png");
  this.load.image("char7", "assets/penguin.png");
  this.load.image("char8", "assets/pig.png");
  this.load.image("char9", "assets/rabbit.png");
  this.load.image("char10", "assets/snake.png");
}

function create() {
  this.add.image(400, 300, "bg");

  // 배 (ship)
  ship = this.physics.add.staticImage(400, 500, "ship").setOrigin(0.5, 0).setScale(1).refreshBody();

  // 바닥 역할하는 보이지 않는 static 그룹 생성
  ground = this.physics.add.staticGroup();
  ground.create(400, 590, null).setDisplaySize(800, 20).refreshBody().setVisible(false);

  createChar(this);

  // 배 중심점 표시 (디버그용)
  let centerPoint = this.add.graphics();
  centerPoint.fillStyle(0xff0000, 1);
  centerPoint.fillCircle(ship.x, ship.y, 5);
  centerPoint.setDepth(1000);

  // 드래그 시작
  this.input.on("dragstart", (pointer, gameObject) => {
    isDragging = true;
    gameObject.body.setAllowGravity(false);
    gameObject.body.setVelocity(0);
    gameObject.body.moves = false;
  });

  // 드래그 중
  this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
    if (gameObject.onShip) {
      const shipBounds = {
        left: ship.x - ship.displayWidth / 2,
        right: ship.x + ship.displayWidth / 2,
        top: ship.y - ship.displayHeight,
        bottom: ship.y + ship.displayHeight,
      };

      if (dragX < shipBounds.left) dragX = shipBounds.left;
      if (dragX > shipBounds.right) dragX = shipBounds.right;

      if (dragY < shipBounds.top) dragY = shipBounds.top;
      if (dragY > shipBounds.bottom) dragY = shipBounds.bottom;

      gameObject.x = dragX;
      gameObject.y = dragY;
      gameObject.relativeX = gameObject.x - ship.x;

      updateShipTilt(this);
    } else {
      gameObject.x = dragX;
      gameObject.y = dragY;
    }
  });

  // 드래그 종료
  this.input.on("dragend", (pointer, gameObject) => {
    isDragging = false;
    if (gameObject.onShip) {
      gameObject.body.moves = false;
      gameObject.body.setVelocity(0);
      gameObject.body.allowGravity = false;
    } else {
      gameObject.body.moves = true;
      gameObject.body.setAllowGravity(true);
    }
  });

  // 캐릭터끼리 충돌 처리
  this.physics.add.collider(characters, characters);

  // 캐릭터와 바닥 충돌 처리
  this.physics.add.collider(characters, ground);

  // 배와 캐릭터 충돌 처리
  this.physics.add.collider(ship, characters, (shipObj, charObj) => {
    if (isDragging) return;
    if (charObj.onShip) return;

    if (charObj.body.touching.down || charObj.body.blocked.down) {
      charObj.onShip = true;
      charObj.body.allowGravity = false;
      charObj.body.setVelocity(0);
      charObj.body.moves = false;
      charObj.relativeX = charObj.x - ship.x;

      console.log(`${charObj.texture.key}가 배 위에 탔습니다.`);

      updateShipTilt(this);
      createChar(this);
    }
  });
}

function createChar(scene) {
  if (currentCharIndex >= charactersData.length) {
    console.log("모든 캐릭터 완료");
    return;
  }
  const data = charactersData[currentCharIndex];
  const char = scene.physics.add.sprite(50, 50, data.key).setInteractive();

  char.setScale(0.2);
  char.setBounce(0.2);
  char.setCollideWorldBounds(true);
  char.weight = data.weight;
  char.onShip = false;
  char.relativeX = null;

  scene.input.setDraggable(char, true);

  characters.push(char);
  currentCharIndex++;
}

function updateShipTilt(scene) {
  let totalWeight = 0;
  let weightedSum = 0;

  characters.forEach(char => {
    if (char.onShip && char.relativeX !== null) {
      totalWeight += char.weight;
      weightedSum += char.relativeX * char.weight;
    }
  });

  if (totalWeight === 0) return;
  const offset = weightedSum / totalWeight;
  const maxAngleDeg = 30;
  const angleDeg = Phaser.Math.Clamp(offset * 0.5, -maxAngleDeg, maxAngleDeg);
  console.log(`배 기울기 각도: ${angleDeg}도`);

  scene.tweens.add({
    targets: ship,
    angle: angleDeg,
    duration: 300,
    ease: "Sine.easeInOut",
  });
}

function update() {
  if (isDragging) return;

  const angleRad = Phaser.Math.DegToRad(ship.angle);
  const shipX = ship.x;
  const shipY = ship.y;

  characters.forEach(char => {
    if (char.onShip && char.relativeX !== null) {
      const rotatedX = shipX + char.relativeX * Math.cos(angleRad);
      const rotatedY = shipY - char.displayHeight / 2 + char.relativeX * Math.sin(angleRad);

      char.x = rotatedX;
      char.y = rotatedY;

      char.body.setVelocity(0);
      char.body.moves = false;
      char.body.allowGravity = false;
    }
  });
}
