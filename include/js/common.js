import { quizData } from "./quizData.js";
import { initScale } from "./scale.js";

const ACT_ON = "on";

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const SHIP_FIXED_Y = GAME_HEIGHT - 160; // 배 고정 y
const MAX_ANGLE_DEG = 30; // 최대 기울기
const MAX_SPEED = 10; // 배 최대 속도
const ACCEL_STEP = 0.2; // 프레임당 속도 증가량

let bgm = null;
let stageTime = 10000; // 스테이지 시간
let boostTime = 1000; // 부스트 유지시간
const stageTargets = [60, 90, 120, 150]; // 목표 점수

let charactersData = [
  { key: "char1", weight: 90, name: "elephant", swimSpeed: 80 },
  { key: "char2", weight: 70, name: "giraffe", swimSpeed: 90 },
  { key: "char3", weight: 80, name: "hippo", swimSpeed: 120 },
  { key: "char4", weight: 30, name: "monkey", swimSpeed: 140 },
  { key: "char5", weight: 50, name: "panda", swimSpeed: 100 },
  { key: "char6", weight: 10, name: "parrot", swimSpeed: 100 },
  { key: "char7", weight: 15, name: "penguin", swimSpeed: 200 },
  { key: "char8", weight: 40, name: "pig", swimSpeed: 110 },
  { key: "char9", weight: 20, name: "rabbit", swimSpeed: 170 },
  { key: "char10", weight: 25, name: "snake", swimSpeed: 150 },
];

const wrap = document.getElementById("wrap");
const startButton = document.querySelector(".js-startButton");
const howToplayButton = document.querySelector(".js-howToPlayButton");
const howToPlayPop = document.querySelector(".js-howToPlayPop");
const howToPlayPopClose = document.querySelector(".js-howToPlayPopClose");
const bgmButton = document.querySelector(".js-bgmButton");
const quizPop = document.querySelector(".js-quizPop");
const quizWrap = document.querySelector(".js-quizWrap");
const boostButton = document.querySelector(".js-boostButton");
const timeUpButton = document.querySelector(".js-timeUpButton");
const nextStageButton = document.querySelector(".js-nextStageButton");
const homeButton = document.querySelector(".js-homeButton");

const score = document.querySelector(".js-score");
const stage = document.querySelector(".js-stage");
const stageNumber = document.querySelector(".js-stageNumber");
const time = document.querySelector(".js-time");

const resultStage = document.querySelector(".js-resultStage");
const resultScore = document.querySelector(".js-resultScore");
const resultNumber = document.querySelector(".js-resultNumber");

const gameOverPop = document.querySelector(".js-gameOverPop");
function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}
initScale(wrap);
function showQuiz(scene, item) {
  // 랜덤 퀴즈 선택
  const randomIndex = Phaser.Math.Between(0, quizData.length - 1);
  const quiz = quizData[randomIndex];
  scene.scene.pause();

  quizPop.classList.add(ACT_ON);
  quizWrap.innerHTML = `
    <div class="quizQuestion" data-item="${item}">
      <div class="item">
        <div class="img"></div>
      </div>
      <div class="question">
        <p>${quiz.question}</p>
      </div>
    </div>
    <ul class="options">
      ${quiz.options.map((opt, i) => `<li data-index="${i}">${opt}</li>`).join("")}
    </ul>    
  `;

  // 선택 이벤트 등록
  const quizQuestions = quizPop.querySelectorAll(".options li");
  quizQuestions.forEach(quizQuestion => {
    quizQuestion.onclick = () => {
      const selectedIndex = Number(quizQuestion.dataset.index);
      checkAnswer(scene, selectedIndex, quiz.answer, item);
      scene.scene.resume();
    };
  });
}

function checkAnswer(scene, selected, answer, item) {
  quizPop.classList.remove(ACT_ON);

  if (selected === answer) {
    scene.sound.play("correct");
    if (item === 0) {
      scene.boostActive = true;
      scene.boostTimer = boostTime; // 10초
    } else if (item === 1) {
      scene.timer += boostTime; // 10초 추가
      time.textContent = Math.ceil(scene.timer / 1000);
    }
  } else {
    scene.sound.play("incorrect");
  }
}

function setGameState(newState, scene) {
  if (scene && typeof scene.state !== "undefined") scene.state = newState;
  wrap.dataset.state = newState;
}

function initBGMButton() {
  bgmButton.onclick = () => {
    if (bgm.isPlaying) {
      bgm.pause();
      bgmButton.classList.add(ACT_ON);
    } else {
      bgm.resume();
      bgmButton.classList.remove(ACT_ON);
    }
  };
}

function updateHUD(ship, gameScene) {
  score.textContent = `${ship.state.totalScore}`;
  stage.textContent = stageTargets[gameScene.currentStageIndex];
  stageNumber.textContent = `${gameScene.currentStageIndex + 1}`;
}

class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  preload() {
    this.load.audio("bgm", "assets/media/bgm.mp3");
  }

  create() {
    if (!bgm) {
      bgm = this.sound.add("bgm", { loop: true, volume: 0.1 });
      bgm.play();
    }
    initBGMButton();

    startButton.onclick = () => {
      setGameState("gameScene");
      this.scene.start("GameScene");
    };

    howToplayButton.onclick = () => howToPlayPop.classList.add(ACT_ON);
    howToPlayPopClose.onclick = () => howToPlayPop.classList.remove(ACT_ON);
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");

    this.ship = null;
    this.characters = [];
    this.onShipChars = [];
    this.tiltTime = 0; // 30도 이상 유지 시간(ms)
    this.tiltGamma = 0; // 모바일 기울기 값
    this.timer = stageTime;
    this.state = "ready";

    this.charactersData = charactersData;
    this.currentStageIndex = 0; // 현재 스테이지

    this.boostActive = false;
    this.boostTimer = 0; // 남은 부스트 시간(ms)
    this.boostMultiplier = 2; // 속도 2배
  }

  preload() {
    this.load.image("bg", "assets/bg.png");
    this.load.audio("success", "assets/media/success.mp3");
    this.load.audio("fail", "assets/media/fail.mp3");
    this.load.audio("correct", "assets/media/correct.mp3");
    this.load.audio("incorrect", "assets/media/incorrect.mp3");
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
    if (!isMobile()) this.cursors = this.input.keyboard.createCursorKeys();

    boostButton.onclick = () => {
      if (boostButton.classList.contains(ACT_ON)) return;
      boostButton.classList.add(ACT_ON);
      showQuiz(this, 0);
    };

    timeUpButton.onclick = () => {
      if (timeUpButton.classList.contains(ACT_ON)) return;
      timeUpButton.classList.add(ACT_ON);
      showQuiz(this, 1);
    };

    nextStageButton.onclick = () => {
      this.startStage(this.currentStageIndex + 1);
    };

    homeButton.onclick = () => {
      this.reset();
      this.currentStageIndex = 0;
      setGameState("mainScene");
      this.scene.start("MainMenuScene");
    };

    this.startStage();
  }

  update(time, delta) {
    if (this.state !== "playing") return;

    this.ship.sprite.y = SHIP_FIXED_Y;

    // 부스트 시간 처리
    if (this.boostActive) {
      this.boostTimer -= delta;
      if (this.boostTimer <= 0) this.boostActive = false;
    }

    // 좌우 이동 방향 계산 모바일이면 기울기 값으로 좌우 이동, PC면 키보드
    let dir = 0;
    if (isMobile()) {
      if (Math.abs(this.tiltGamma) > 5) dir = this.tiltGamma > 0 ? 1 : -1;
    } else dir = (this.cursors.right.isDown ? 1 : 0) - (this.cursors.left.isDown ? 1 : 0);

    // 배 이동 속도에 부스트 적용 (MAX_SPEED 증가)
    const currentMaxSpeed = this.boostActive ? MAX_SPEED * this.boostMultiplier : MAX_SPEED;
    this.ship.move(dir, currentMaxSpeed);

    // 캐릭터 업데이트
    this.characters.forEach(character => character.update(this.ship));

    // 배 상태 업데이트 및 기울기 적용
    this.ship.updateState(this.onShipChars);
    this.ship.applyTilt();

    // HUD 업데이트
    updateHUD(this.ship, this);

    // 배 기울기 경고 처리
    this.handleTiltWarning(delta);

    // 타이머
    this.updateTimer(delta);
  }

  // 게임 시작
  startStage(stageIndex = 0) {
    this.currentStageIndex = stageIndex;
    this.targetScore = stageTargets[stageIndex];

    this.reset(); // 캐릭터, 타이머, 배 초기화
    setGameState("playing", this);

    this.charactersData.sort(() => Math.random() - 0.5);

    stage.textContent = stageTargets[this.currentStageIndex];

    // 게임 시작 시 BGM 재생 (이미 재생 중이면 무시)
    if (!bgm.isPlaying && !bgm.isPaused) bgm.play();

    // 모바일 기울기 이벤트 (최초 한 번만 등록해도 된다면 조건 추가)
    if (isMobile() && window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", e => (this.tiltGamma = e.gamma || 0));
    }

    // 캐릭터 생성
    this.charTimer = this.time.addEvent({
      delay: 1000,
      callback: () => this.createChar(),
      // repeat: this.charactersData.length - 1,
      loop: true,
    });
  }

  createChar() {
    if (this.state !== "playing") return;
    const data = this.charactersData[Phaser.Math.Between(0, this.charactersData.length - 1)];
    const x = Phaser.Math.Between(100, GAME_WIDTH - 100);
    const char = new Character(this, data, x);
    this.characters.push(char);
  }

  handleTiltWarning(delta) {
    if (Math.abs(this.ship.state.angleDeg) >= MAX_ANGLE_DEG) {
      this.tiltTime += delta;
      this.warningOverlay.setVisible(Math.floor(this.tiltTime / 200) % 2 === 0);
      if (!this.warning.isPlaying) this.warning.play();
      if (this.tiltTime >= 3000) this.gameOver("end");
    } else {
      this.tiltTime = 0;
      this.warningOverlay.setVisible(false);
      if (this.warning.isPlaying) this.warning.stop();
    }
  }

  updateTimer(delta) {
    if (this.state !== "playing") return;
    if (this.timer <= 0) {
      if (this.ship.state.totalScore >= this.targetScore) {
        if (this.currentStageIndex >= stageTargets.length - 1) this.gameOver("final");
        else this.gameOver("next");
      } else this.gameOver("end");
    } else {
      this.timer = this.timer - delta;
      time.textContent = Math.max(0, Math.ceil(this.timer / 1000));
    }
  }

  // 게임오버 처리
  gameOver(state) {
    this.state = "paused";
    setGameState("gameover", this);
    if (state == "end") {
      this.sound.play("fail");
      this.ship.fallOver();
      this.onShipChars.forEach(onShipChar => onShipChar.fall());
    } else {
      this.sound.play("success");
    }
    this.ship.stop();

    gameOverPop.classList.add(ACT_ON);
    gameOverPop.dataset.state = state;

    // 결과 표시
    resultNumber.textContent = `${this.currentStageIndex + 1}`;
    if (state === "end") {
      resultStage.textContent = "실패";
      this.currentStageIndex = 0;
    } else resultStage.textContent = "성공";
    if (state === "final") {
      console.log("모든 게임 완료");
    }

    resultScore.textContent = this.ship.state.totalScore;
  }

  reset() {
    if (this.charTimer) {
      this.charTimer.remove();
      this.charTimer = null;
    }
    this.warningOverlay.setVisible(false);
    this.characters.forEach(character => character.destroy());
    this.characters = [];
    this.onShipChars = [];
    this.tiltTime = 0;
    this.timer = stageTime;
    this.ship.reset();
    gameOverPop.classList.remove(ACT_ON);
    quizPop.classList.remove(ACT_ON);
    this.boostActive = false;
    this.boostTimer = 0;
    boostButton.classList.remove(ACT_ON);
    timeUpButton.classList.remove(ACT_ON);
  }
}

class Ship {
  constructor(scene, x, y, shipShapes) {
    this.scene = scene;
    // 배 생성 상태
    this.sprite = scene.matter.add.sprite(x, y, "ship", 0, { shape: shipShapes.ship }).setScale(0.3).setDepth(10);
    this.state = { leftTorque: 0, rightTorque: 0, angleDeg: 0, totalScore: 0 };
    this.prevDir = 0; // 이전 방향 저장
  }

  // 배 좌우 이동
  move(dir, maxSpeed) {
    const v = this.sprite.body.velocity.x;
    if (dir) {
      const accelStep = this.scene.boostActive ? ACCEL_STEP * this.scene.boostMultiplier : ACCEL_STEP;
      this.sprite.setVelocityX(Phaser.Math.Clamp(v + dir * accelStep, -maxSpeed, maxSpeed));

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
    this.state.angleDeg = Phaser.Math.Clamp((right - left) * 0.005, -MAX_ANGLE_DEG, MAX_ANGLE_DEG);
    this.state.totalScore = total;
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

    // 점수 텍스트
    this.scoreText = scene.add
      .text(this.obj.x, this.obj.y - 50, `+${this.weight}`, {
        font: "24px Arial",
        fill: "#ffff00",
        stroke: "#000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0); // 처음엔 안보이게

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

        // 점수 텍스트 따라오기
        if (this.scoreText) {
          this.scoreText.x = this.obj.x;
          this.scoreText.y = this.obj.y - 20;
        }
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

    // 점수 텍스트 보이게 + 위로 올라가도록 애니메이션
    this.scoreText.setPosition(this.obj.x, this.obj.y - 50);
    this.scoreText.setAlpha(1);
    this.scene.tweens.add({
      targets: this.scoreText,
      y: this.obj.y - 70, // 위로 이동
      alpha: 0, // 점점 사라짐
      duration: 1000,
      ease: "Cubic.easeOut",
      onComplete: () => this.scoreText.destroy(),
    });
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
      onComplete: () => {
        this.offScreen = true;
        this.destroy();
      },
    });
  }

  destroy() {
    this.obj.destroy();
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "wrap",
  physics: { default: "matter", matter: { debug: true, gravity: { y: 0 } } },
  scene: [MainMenuScene, GameScene],
  scale: {
    mode: isMobile() ? Phaser.Scale.FIT : Phaser.Scale.NONE, // 모바일이면 화면 맞춤
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: "wrap",
    orientation: Phaser.Scale.LANDSCAPE, // 모바일 가로 모드 강제
  },
};

new Phaser.Game(config);
