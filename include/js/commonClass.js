const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const SHIP_FIXED_Y = GAME_HEIGHT - 160; // 배 고정 y
const MAX_ANGLE_DEG = 30; // 최대 기울기
const MAX_SPEED = 10; // 배 최대 속도
const ACCEL_STEP = 0.2; // 프레임당 속도 증가량

class Ship {
  constructor(scene, x, y, shipShapes) {
    this.scene = scene;
    // 배 생성 상태
    this.sprite = scene.matter.add.sprite(x, y, "ship", 0, { shape: shipShapes.ship }).setScale(0.3).setDepth(10);
    this.state = { leftTorque: 0, rightTorque: 0, angleDeg: 0, totalWeight: 0 };
    this.prevDir = 0; // 이전 방향 저장
  }

  // 배 좌우 이동
  move(dir) {
    const v = this.sprite.body.velocity.x;
    if (dir) {
      this.sprite.setVelocityX(Phaser.Math.Clamp(v + dir * ACCEL_STEP, -MAX_SPEED, MAX_SPEED));

      // 방향이 바뀌었을 때만 사운드 재생
      if (dir !== this.prevDir) {
        this.scene.shipCreak.play({ rate: Phaser.Math.FloatBetween(0.95, 1.05) });
        this.prevDir = dir;
      }
    } else {
      this.sprite.setVelocityX(v * 0.98); // 감속
      this.prevDir = 0; // 정지 상태면 방향 초기화
    }
    if (dir !== 0) this.sprite.setFrame(dir < 0 ? 1 : 0); // 좌우 이미지
  }

  // 배 상태(좌/우 토크, 기울기, 총 무게) 계산
  updateState(characters) {
    let left = 0,
      right = 0,
      total = 0;
    characters.forEach(character => {
      const torque = Math.abs(character.relativeX) * character.weight;
      character.relativeX < 0 ? (left += torque) : (right += torque);
      total += character.weight;
    });
    this.state.leftTorque = left;
    this.state.rightTorque = right;
    this.state.angleDeg = Phaser.Math.Clamp((right - left) * 0.0005, -MAX_ANGLE_DEG, MAX_ANGLE_DEG);
    this.state.totalWeight = total;
  }

  // 배 기울기 적용 (Tween)
  applyTilt() {
    this.scene.tweens.add({
      targets: this.sprite,
      angle: this.state.angleDeg,
      duration: 100,
      ease: "Sine.easeInOut",
    });
  }

  // 배가 넘어지는 애니메이션
  fallOver() {
    this.scene.tweens.add({
      targets: this.sprite,
      angle: this.state.leftTorque > this.state.rightTorque ? -180 : 180,
      duration: 1000,
      ease: "Sine.easeIn",
    });
  }

  stop() {
    this.sprite.setVelocity(0, 0);
    this.sprite.setAngularVelocity(0);
  }

  reset() {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setPosition(GAME_WIDTH / 2, SHIP_FIXED_Y);
    this.sprite.setAngle(0);
  }
}

class Character {
  constructor(scene, data, x) {
    this.scene = scene;
    this.obj = scene.add.sprite(x, -50, data.key).setScale(0.2);
    this.weight = data.weight;
    this.onShip = false;
    this.onGround = false;
    this.relativeX = 0;
    this.data = data;

    // 좌우 흔들림 설정
    this.sway = {
      amplitude: Phaser.Math.Between(15, 50), // 좌우 이동 최대 거리
      speed: Phaser.Math.FloatBetween(0.001, 0.004), // 흔들리는 속도
      offset: Phaser.Math.FloatBetween(0, Math.PI * 2), // 시작 각
    };
  }

  // 캐릭터 위치 업데이트 (낙하, 배 위, 좌우 흔들림)
  update(ship) {
    const shipTop = ship.sprite.y - 10;

    if (!this.onShip && !this.onGround) {
      this.obj.y += 2 + this.weight * 0.002; // 낙하 속도 (무게 반영)
      this.obj.x += Math.sin(performance.now() * this.sway.speed + this.sway.offset) * this.sway.amplitude * 0.05; // 좌우 흔들림 (사인 + 랜덤 속도)
      this.obj.x = Phaser.Math.Clamp(this.obj.x, 0, GAME_WIDTH); // 화면 밖으로 못 나가게 제한

      // 낙하 스케일 점점 줄이기
      const minScale = 0.08; // 최소 스케일
      if (this.obj.scaleX > minScale) {
        this.obj.setScale(this.obj.scaleX - 0.0002); // 프레임마다 조금씩 줄이기
      }

      const shipLeft = ship.sprite.x - ship.sprite.displayWidth / 2;
      const shipRight = ship.sprite.x + ship.sprite.displayWidth / 2;

      if (this.obj.y + this.obj.displayHeight >= SHIP_FIXED_Y && this.obj.x >= shipLeft && this.obj.x <= shipRight) {
        // 배 위
        this.onShip = true;
        this.scene.onShipChars.push(this);
        this.relativeX = this.obj.x - ship.sprite.x;
        this.obj.y = shipTop - this.obj.displayHeight / 2;
        this.obj.setScale(0.2); // 배 위 스케일 적용
        this.shipOn();
      } else if (this.obj.y + this.obj.displayHeight >= SHIP_FIXED_Y + this.obj.displayHeight) {
        // 바닥
        this.onGround = true;
        this.obj.y = GAME_HEIGHT - this.obj.displayHeight;
        this.obj.setScale(0.2); // 바닥 스케일 적용
        this.moveOffScreen();
        this.groundOn();
      }
    } else if (this.onShip) {
      // 배 기울기에 따라 위치 계산
      const angleRad = Phaser.Math.DegToRad(ship.sprite.angle);
      const rotatedX = this.relativeX * Math.cos(angleRad);
      const rotatedY = this.relativeX * Math.sin(angleRad);
      this.obj.x = ship.sprite.x + rotatedX;
      this.obj.y = shipTop - this.obj.displayHeight / 2 + rotatedY;
    }
  }

  // 배 위 애니메이션
  shipOn() {
    const key = this.data.key + "_on";

    this.obj.setTexture(key);
    if (!this.scene.anims.exists(key + "_anim")) {
      this.scene.anims.create({
        key: key + "_anim",
        frames: this.scene.anims.generateFrameNumbers(key, { start: 0, end: 1 }),
        frameRate: 5,
        repeat: -1,
      });
    }
    this.obj.play(key + "_anim");
  }

  // 바닥 애니메이션
  groundOn() {
    const sheetKey = this.data.key + "_swim";
    const goingLeft = this.obj.x <= GAME_WIDTH / 2;
    const animKey = sheetKey + (goingLeft ? "_left" : "_right");

    const startFrame = goingLeft ? 0 : 2;
    const endFrame = goingLeft ? 1 : 3;

    this.obj.setTexture(sheetKey, startFrame);

    if (!this.scene.anims.exists(animKey)) {
      this.scene.anims.create({
        key: animKey,
        frames: this.scene.anims.generateFrameNumbers(sheetKey, { start: startFrame, end: endFrame }),
        frameRate: 5,
        repeat: -1,
      });
    }

    this.obj.play(animKey, true);
  }

  // 배에서 떨어져 바닥으로 이동 할때
  fall() {
    this.onShip = false;
    // const targetY = GAME_HEIGHT - this.obj.displayHeight; // 바닥 위치        
    const targetY = Phaser.Math.Between(GAME_HEIGHT - 10, SHIP_FIXED_Y + 50);
    this.scene.tweens.add({
      targets: this.obj,
      y: targetY,
      duration: 500 + Math.random() * 300, // 조금씩 차이를 줘서 자연스럽게
      ease: "Sine.easeIn",
      onComplete: () => this.moveOffScreen(),
    });
  }

  // 바닥에 떨어진 캐릭터들 좌우 가까운 방향으로 이동
  moveOffScreen() {    
    if (this.scene.swimSound) {
      this.scene.swimSound.play();
      this.groundOn();
    }
    this.obj.setDepth(this.obj.y);
    const moveSpeed = this.data.swimSpeed || 200;
    const targetX = this.obj.x < GAME_WIDTH / 2 ? -50 : GAME_WIDTH + 50;
    const distance = Math.abs(targetX - this.obj.x);
    const duration = (distance / moveSpeed) * 500;
    this.scene.tweens.add({
      targets: this.obj,
      x: targetX,
      duration,
      ease: "Linear",
      onUpdate: () => this.obj.setDepth(this.obj.y),
      onComplete: () => this.destroy(),
    });
  }

  destroy() {
    this.obj.destroy();
  }
}

function updateHUD(ship, velocityX, dir) {
  document.querySelector(".speedText").textContent = `속도: ${Math.abs(velocityX).toFixed(2)}`;
  document.querySelector(".angle").textContent = `기울기: ${ship.state.angleDeg.toFixed(2)}`;
  document.querySelector(".weight").textContent = `총무게: ${ship.state.totalWeight}`;

  const hud = document.querySelector(".hud");
  hud.className = `hud ${dir === -1 ? "left" : dir === 1 ? "right" : ""}`;
}

function showQuiz() {
  const quizWrap = document.querySelector(".quizWrap");
  const questionDiv = quizWrap.querySelector(".quizQuestion");
  const input = quizWrap.querySelector(".quizInput");
  const submitBtn = quizWrap.querySelector(".quizSubmit");
  const messageDiv = quizWrap.querySelector(".quizMessage");

  let currentQuizIndex = 0;

  const quizData = [
    { question: "1", answer: "1" },
    { question: "2", answer: "2" },
    { question: "3", answer: "3" },
    { question: "4", answer: "4" },
  ];

  quizWrap.classList.add("on");

  if (currentQuizIndex >= quizData.length) {
    questionDiv.textContent = "모든 퀴즈 완료!";
    messageDiv.textContent = "";
    return;
  }

  const { question, answer } = quizData[currentQuizIndex];
  questionDiv.textContent = question;
  input.value = "";
  messageDiv.textContent = "";

  // 클릭 이벤트
  submitBtn.onclick = () => {
    if (input.value.trim() === answer) {
      messageDiv.textContent = "정답!";
      currentQuizIndex++;
      showQuiz();
    } else messageDiv.textContent = "틀렸습니다. 다시 시도!";
  };
}

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");

    this.ship = null;
    this.characters = [];
    this.onShipChars = [];
    this.charIndex = 0;
    this.tiltTime = 0; // 30도 이상 유지 시간(ms)
    this.tiltGamma = 0; // 모바일 기울기 값
    this.state = "ready";
    this.bgm = null; // BGM

    this.charactersData = [
      { key: "char1", weight: 900, name: "elephant", swimSpeed: 80 },
      { key: "char2", weight: 700, name: "giraffe", swimSpeed: 90 },
      { key: "char3", weight: 800, name: "hippo", swimSpeed: 120 },
      { key: "char4", weight: 300, name: "monkey", swimSpeed: 140 },
      { key: "char5", weight: 500, name: "panda", swimSpeed: 100 },
      { key: "char6", weight: 100, name: "parrot", swimSpeed: 100 },
      { key: "char7", weight: 150, name: "penguin", swimSpeed: 200 },
      { key: "char8", weight: 400, name: "pig", swimSpeed: 110 },
      { key: "char9", weight: 200, name: "rabbit", swimSpeed: 170 },
      { key: "char10", weight: 250, name: "snake", swimSpeed: 150 },
    ];
  }

  preload() {
    this.load.image("bg", "assets/bg.png");
    this.load.audio("bgm", "assets/media/bgm.mp3");
    this.load.audio("swim", "assets/media/swim.mp3"); // 수영 사운드
    this.load.audio("shipCreak", "assets/media/splash.mp3"); // 배 이동 사운드
    this.load.audio("warning", "assets/media/warning.mp3"); // 경고음
    this.load.spritesheet("ship", "assets/ship.png", { frameWidth: 853, frameHeight: 434 });
    this.charactersData.forEach(char => {
      this.load.image(char.key, "assets/" + char.name + ".png");
      this.load.spritesheet(char.key + "_on", "assets/" + char.name + "_on.png", {
        frameWidth: 310,
        frameHeight: 400,
      });
      this.load.spritesheet(char.key + "_swim", "assets/" + char.name + "_swim.png", {
        frameWidth: 482,
        frameHeight: 236,
      });
    });
    this.load.json("shipPhysics", "assets/ship.json");
  }

  create() {
    // 화면 밖으로 나가지 못하게
    this.matter.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // bgm 생성 및 재생
    this.bgm = this.sound.add("bgm", { loop: true, volume: 0.2 });
    this.initBGMButton();

    // 수영 효과음 생성
    this.swimSound = this.sound.add("swim", { volume: 0.5 });

    // 배 이동 사운드
    this.shipCreak = this.sound.add("shipCreak", { volume: 0.3 });

    // 경고음
    this.warning = this.sound.add("warning", { volume: 0.3 });

    // 배경 생성
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "bg").setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // 배 생성
    const shipShapes = this.cache.json.get("shipPhysics");
    this.ship = new Ship(this, GAME_WIDTH / 2, SHIP_FIXED_Y, shipShapes);

    // 경고 오버레이 (배 기울기 경고용)
    this.warningOverlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xff0000, 0.3).setOrigin(0).setDepth(100).setVisible(false);

    // PC용 키보드
    if (!this.isMobile()) this.cursors = this.input.keyboard.createCursorKeys();

    // 버튼 이벤트
    document.querySelector(".start").addEventListener("click", () => this.startGame());
    document.querySelector(".retry").addEventListener("click", () => this.startGame());
  }

  update(time, delta) {
    if (this.state !== "playing") return;

    this.ship.sprite.y = SHIP_FIXED_Y;

    // 좌우 이동 방향 계산 모바일이면 기울기 값으로 좌우 이동, PC면 키보드
    let dir = 0;
    if (this.isMobile()) {
      if (Math.abs(this.tiltGamma) > 5) dir = this.tiltGamma > 0 ? 1 : -1;
    } else dir = (this.cursors.right.isDown ? 1 : 0) - (this.cursors.left.isDown ? 1 : 0);

    this.ship.move(dir);

    // 캐릭터 업데이트
    this.characters.forEach(character => character.update(this.ship));

    // 배 상태 업데이트 및 기울기 적용
    this.ship.updateState(this.onShipChars);
    this.ship.applyTilt();

    // HUD 업데이트
    updateHUD(this.ship, this.ship.sprite.body.velocity.x, dir);

    // 배 기울기 경고 처리
    this.handleTiltWarning(delta);
  }

  setGameState(newState) {
    this.state = newState;
    document.getElementById("wrap").dataset.state = newState;
  }

  // 게임 시작
  startGame() {
    this.setGameState("playing");
    this.charIndex = 0;
    this.charactersData.sort(() => Math.random() - 0.5);
    this.reset();

    // 게임 시작 시 BGM 재생 (이미 재생 중이면 무시)
    if (!this.bgm.isPlaying && !this.bgm.isPaused) this.bgm.play();

    // 모바일 기울기 이벤트
    if (this.isMobile() && window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", e => (this.tiltGamma = e.gamma || 0));
    }

    // 캐릭터 생성
    this.time.addEvent({
      delay: 1000,
      callback: () => this.createChar(),
      repeat: this.charactersData.length - 1,
    });
  }

  createChar() {
    if (this.charIndex >= this.charactersData.length) return;
    const data = this.charactersData[this.charIndex++];
    const x = Phaser.Math.Between(100, GAME_WIDTH - 100);
    const char = new Character(this, data, x);
    this.characters.push(char);
  }

  handleTiltWarning(delta) {
    if (Math.abs(this.ship.state.angleDeg) >= MAX_ANGLE_DEG) {
      this.tiltTime += delta;
      this.warningOverlay.setVisible(Math.floor(this.tiltTime / 200) % 2 === 0);
      if (!this.warning.isPlaying) this.warning.play();
      if (this.tiltTime >= 3000) this.gameOver();
    } else {
      this.tiltTime = 0;
      this.warningOverlay.setVisible(false);
      if (this.warning.isPlaying) this.warning.stop();
    }
  }

  // 게임오버 처리
  gameOver() {
    this.ship.fallOver();
    this.setGameState("gameover");
    this.ship.stop();
    this.onShipChars.forEach(onShipChar => onShipChar.fall());

    // 게임오버 시 BGM 정지
    if (this.bgm.isPlaying) this.bgm.stop();
  }

  // bgm
  initBGMButton() {
    const bgmBtn = document.querySelector(".bgmToggle");
    bgmBtn.onclick = () => {
      if (this.bgm.isPlaying) {
        this.bgm.pause();
        bgmBtn.classList.add("on");
      } else {
        this.bgm.resume();
        bgmBtn.classList.remove("on");
      }
    };
  }

  reset() {
    this.warningOverlay.setVisible(false);
    this.characters.forEach(character => character.destroy());
    this.characters = [];
    this.onShipChars = [];
    this.tiltTime = 0;
    this.ship.reset();
  }

  isMobile() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    physics: { default: "matter", matter: { debug: true, gravity: { y: 0 } } },
    scene: [GameScene],
  };
  new Phaser.Game(config);
});
