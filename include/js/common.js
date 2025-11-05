import { quizData } from "./quizData.js";
import { initScale } from "./scale.js";

const ACT_ON = "on";

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const SHIP_FIXED_Y = GAME_HEIGHT - 190; // 배 고정 y
const MAX_ANGLE_DEG = 18; // 최대 기울기
const MAX_SPEED = 10; // 배 최대 속도
const ACCEL_STEP = 0.15; // 프레임당 속도 증가량

let bgm = null;
let stageTime = 30000; // 스테이지 시간
let boostTime = 7000; // 부스트 유지시간
let orientation = false;
let tiltGamma = 0; // 모바일 가로, 세로 모드에 따라 감마, 베타값
let totalScore = 0;

const stageTargets = [
  { targetScore: 500 },
  { targetScore: 1050 },
  { targetScore: 1650 },
  { targetScore: 2300 },
  { targetScore: 3000 },
  { targetScore: 3750 },
  { targetScore: 4550, whaleCount: 1 },
  { targetScore: 5400, whaleCount: 1 },
  { targetScore: 6300, whaleCount: 2 },
  { targetScore: 7000, whaleCount: 3 },
];

const charactersData = [
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
const orientationButton = document.querySelector(".js-orientationButton");
const quizPop = document.querySelector(".js-quizPop");
const gamePause = document.querySelector(".js-gamePause");
const quizQuestion = document.querySelector(".js-quizQuestion");
const quizzButtons = document.querySelectorAll(".js-quizzButtons");
const boostItem = document.querySelector(".js-boostItem");
const boostCount = document.querySelector(".js-boostCount");
const timeUpItem = document.querySelector(".js-timeUpItem");
const timeUpCount = document.querySelector(".js-timeUpCount");
const nextStageButton = document.querySelectorAll(".js-nextStageButton");
const quizMarketButton = document.querySelector(".js-quizMarketButton");
const homeButtons = document.querySelectorAll(".js-homeButton");
const timerBar = document.querySelector(".js-timerBar");
const score = document.querySelector(".js-score");
const stage = document.querySelector(".js-stage");
const stageNumber = document.querySelector(".js-stageNumber");
const resultScore = document.querySelector(".js-resultScore");
const resultNumber = document.querySelector(".js-resultNumber");
const gameOverPop = document.querySelector(".js-gameOverPop");
const quizMarketPop = document.querySelector(".js-quizMarketPop");
const mobileLeftButton = document.querySelector(".js-mobileLeftButton");
const mobileRightButton = document.querySelector(".js-mobileRightButton");
const resultItem = document.querySelector(".js-resultItem");
const resultBubble = document.querySelector(".js-resultBubble");
const question = document.querySelector(".js-question");
const loadingBar = document.querySelector(".js-loadingBar");
const loadingBoat = document.querySelector(".js-loadingBoat");
let quizIndexPointer = 0;

function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

initScale(wrap);

if (isMobile()) wrap.classList.add("mobile");
if (isMobile() && window.DeviceOrientationEvent) {
  wrap.classList.add("mobile");
  window.addEventListener("deviceorientation", e => {
    const isPortraitNow = window.innerHeight > window.innerWidth;
    tiltGamma = isPortraitNow ? e.gamma : e.beta;
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(() => (tiltGamma = 0), 100);
  });
}

// hover
function addHover(btn) {
  btn.addEventListener("mouseover", () => btn.classList.add("hover"));
  btn.addEventListener("mouseout", () => btn.classList.remove("hover"));
}

// 아이템별 퀴즈 상태 저장
function showQuiz(scene, item) {
  const quizIndex = quizIndexPointer;
  quizIndexPointer = (quizIndexPointer + 1) % quizData.length;
  const quiz = quizData[quizIndex];

  quizPop.dataset.item = item;
  quizPop.classList.add(ACT_ON);

  // 질문 표시
  question.innerHTML = quiz.question;

  // 보기 세팅
  const optionsList = quizQuestion.querySelector(".options");
  optionsList.querySelectorAll("li").forEach((li, i) => {
    li.textContent = quiz.options[i] || "";
    li.classList.remove(ACT_ON);
    li.onclick = () => {
      li.classList.add(ACT_ON);
      quizQuestion.classList.add(ACT_ON);

      // 정답 체크
      checkAnswer(scene, i, quiz.answer, item);
    };
  });

  // 결과 영역 초기화
  resultBubble.classList.remove(ACT_ON);
  resultItem.classList.remove(ACT_ON);
  quizQuestion.classList.remove(ACT_ON);
}

function checkAnswer(scene, selected, answer, item) {
  const correct = selected === answer;

  // 정답 사운드 & 보상 처리
  if (correct) {
    scene.sound.play("correct");

    if (item === 0) {
      scene.boostCount++;
      boostItem.dataset.count = scene.boostCount;
      boostCount.textContent = scene.boostCount;
    } else if (item === 1) {
      scene.timeUpBonus++;
      timeUpItem.dataset.count = scene.timeUpBonus;
      timeUpCount.textContent = scene.timeUpBonus;
    }
  } else {
    scene.sound.play("incorrect");
  }

  // 결과 UI
  resultBubble.textContent = correct ? "정답 입니다." : "오답 입니다.";
  resultBubble.classList.add(ACT_ON);
  resultItem.classList.toggle(ACT_ON, !correct);
  quizzButtons[item].classList.add(correct ? "correct" : "incorrect");

  // 1초 후 팝업 닫기
  scene.time.delayedCall(1000, () => {
    quizPop.classList.remove(ACT_ON, "answered");
  });
}

// 게임 진행 상태
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

// 자이로 센서 of/off
function initOrientation() {
  orientationButton.onclick = () => {
    if (orientation == false) {
      orientation = true;
      orientationButton.classList.add(ACT_ON);
      mobileLeftButton.classList.add(ACT_ON);
      mobileRightButton.classList.add(ACT_ON);
    } else {
      orientation = false;
      orientationButton.classList.remove(ACT_ON);
      mobileLeftButton.classList.remove(ACT_ON);
      mobileRightButton.classList.remove(ACT_ON);
    }
  };
}

function updateHUD(ship, gameScene) {
  score.textContent = `${ship.state.stageScore + totalScore}`;
  stage.textContent = stageTargets[gameScene.currentStageIndex].targetScore;
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
    }
    initBGMButton();
    initOrientation();

    startButton.onclick = () => {
      if (bgm.isPlaying) bgm.resume();
      else bgm.pause();
      setGameState("gameScene");
      this.scene.start("GameScene", { charactersData });
      quizData.sort(() => Math.random() - 0.5);
    };

    addHover(startButton);
    addHover(howToplayButton);
    addHover(howToPlayPopClose);
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
    this.whales = [];
    this.tiltTime = 0; // 30도 이상 유지 시간
    this.timer = stageTime;
    this.state = "ready";

    this.currentStageIndex = 0; // 현재 스테이지
    this.boostActive = false;
    this.boostTimer = 0; // 부스트 시간
    this.boostMultiplier = 2; // 속도 2배
    this.boostFlashTween = null;
    this.mobileDir = 0; // 좌우 버튼 방향 상태
    this.boostCount = 1; // 부스트 아이템
    this.timeUpBonus = 1; // 추가 시간 아이템
    this.prevTiltDir = 0;
  }

  init(data) {
    this.charactersData = data.charactersData;
  }

  create() {
    this.matter.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT); // 화면 밖으로 나가지 못하게
    this.swimSound = this.sound.add("swim", { volume: 0.5 }); // 수영 효과음 생성
    this.shipCreak = this.sound.add("shipCreak", { volume: 0.3 }); // 배 이동 사운드
    this.warning = this.sound.add("warning", { volume: 0.3 }); // 경고음
    this.timerSound = this.sound.add("timer", { loop: true, volume: 0.5 }); //10초 카운트
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "bg").setDisplaySize(GAME_WIDTH, GAME_HEIGHT); // 배경 생성
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT, "wave")
      .setOrigin(0.5, 1)
      .setScale(0.6667)
      .setDepth(11);

    const shipShapes = this.cache.json.get("shipPhysics"); // 배 생성
    this.ship = new Ship(this, GAME_WIDTH / 2, SHIP_FIXED_Y, shipShapes);

    this.anims.create({
      key: "boostWing_anim",
      frames: this.anims.generateFrameNumbers("boostWing", { start: 0, end: 1 }),
      frameRate: 2,
      repeat: -1,
    });

    // PC용 키보드
    if (!isMobile()) this.cursors = this.input.keyboard.createCursorKeys();

    quizzButtons.forEach((quizzButton, index) => {
      quizzButton.onclick = () => showQuiz(this, index);
    });

    boostItem.onclick = () => {
      this.boostActive = true;
      this.boostTimer = boostTime; // 부스터 10초
      this.boostCount = this.boostCount - 1;
      boostItem.dataset.count = this.boostCount;
      boostCount.textContent = this.boostCount;
      boostItem.classList.add(ACT_ON);
    };

    timeUpItem.onclick = () => {
      this.timer += boostTime; // 시간 10초 추가
      this.timeUpBonus = this.timeUpBonus - 1;
      timeUpItem.dataset.count = this.timeUpBonus;
      timeUpCount.textContent = this.timeUpBonus;
    };

    nextStageButton.forEach(nextStageBtn => {
      nextStageBtn.onclick = () => {
        this.reset();
        quizMarketPop.classList.remove(ACT_ON);
        this.currentStageIndex = this.currentStageIndex + 1;
        this.startStage(this.currentStageIndex);
      };
    });

    quizMarketButton.onclick = () => {
      this.reset();
      setGameState("quizMarket", this);
      quizMarketPop.classList.add(ACT_ON);
    };

    homeButtons.forEach(homeButton => {
      homeButton.onclick = () => {
        this.reset();
        this.currentStageIndex = 0;
        totalScore = 0;
        this.boostCount = 1;
        this.timeUpBonus = 1;
        boostItem.dataset.count = this.boostCount;
        timeUpItem.dataset.count = this.timeUpBonus;
        boostCount.textContent = this.boostCount;
        timeUpCount.textContent = this.timeUpBonus;
        gamePause.classList.remove(ACT_ON);
        wrap.classList.remove("paused");
        setGameState("mainScene");
        this.scene.start("MainMenuScene");
      };
    });

    gamePause.onclick = () => {
      if (gamePause.classList.contains(ACT_ON)) {
        gamePause.classList.remove(ACT_ON);
        wrap.classList.remove("paused");
        this.scene.resume();
      } else {
        gamePause.classList.add(ACT_ON);
        wrap.classList.add("paused");
        this.scene.pause();
      }
    };

    // 모바일 좌우 버튼 이벤트
    mobileLeftButton.addEventListener("touchstart", () => (this.mobileDir = -1));
    mobileLeftButton.addEventListener("touchend", () => (this.mobileDir = 0));
    mobileRightButton.addEventListener("touchstart", () => (this.mobileDir = 1));
    mobileRightButton.addEventListener("touchend", () => (this.mobileDir = 0));

    this.startStage();
  }

  update(time, delta) {
    if (this.state !== "playing") return;

    this.ship.sprite.y = SHIP_FIXED_Y;

    // 좌우 이동 방향 계산 모바일이면 기울기 값으로 좌우 이동, PC면 키보드
    let dir = 0;
    if (isMobile()) {
      if (!orientation) {
        if (Math.abs(tiltGamma) > 5) dir = tiltGamma > 0 ? 1 : -1;
      } else dir = this.mobileDir; // 버튼으로 이동
    } else dir = (this.cursors.right.isDown ? 1 : 0) - (this.cursors.left.isDown ? 1 : 0);

    // 부스트 시간 처리
    if (this.boostActive) {
      this.boostTimer -= delta;
      if (this.boostTimer <= 0) {
        this.boostActive = false;
        boostItem.classList.remove(ACT_ON);
      }
    }

    // 배 이동 속도에 부스트 적용 (MAX_SPEED 증가)
    const currentMaxSpeed = this.boostActive ? MAX_SPEED * this.boostMultiplier : MAX_SPEED;
    this.ship.move(dir, currentMaxSpeed);

    //  배 부스트 처리
    if (this.boostActive && !this.ship.boostFlashTween) {
      this.ship.boostWing.setVisible(true);

      if (!this.ship.boostWing.anims.isPlaying) {
        this.ship.boostWing.play("boostWing_anim");
      }
    } else {
      this.ship.boostWing.setVisible(false);
      this.ship.boostWing.stop(); // 애니메이션 정지
    }

    if (!this.boostActive && this.ship.boostFlashTween) {
      this.ship.boostFlashTween.remove(false);
      this.ship.sprite.clearTint();
      this.ship.boostFlashTween = null;
    }

    // 캐릭터 업데이트
    this.characters.forEach(character => character.update(this.ship));

    // 배 상태 업데이트 및 기울기 적용
    this.ship.applyTilt();
    this.ship.updateState(this.onShipChars);

    // HUD 업데이트
    updateHUD(this.ship, this, dir);

    // 배 기울기 경고 처리
    this.handleTiltWarning(delta);

    // 타이머
    this.updateTimer(delta);
  }

  // 게임 시작
  startStage(stageIndex = 0) {
    this.currentStageIndex = stageIndex;
    this.targetScore = stageTargets[stageIndex].targetScore;
    setGameState("playing", this);
    this.charactersData.sort(() => Math.random() - 0.5);
    stage.textContent = stageTargets[this.currentStageIndex].targetScore;

    // 게임 시작 시 BGM 재생 (이미 재생 중이면 무시)
    if (!bgm.isPlaying && !bgm.isPaused) bgm.play();

    // 캐릭터 생성
    this.charTimer = this.time.addEvent({
      delay: 1000,
      callback: () => this.createChar(),
      loop: true,
    });

    // 고래 생성
    const count = stageTargets[this.currentStageIndex].whaleCount || 0;
    if (count > 0) this.spawnWhaleSequence(count);
  }

  // 화면을 10개 구역으로 나누고, 각 구역 내에서 ±100px 범위 랜덤으로 캐릭터 생성
  createChar() {
    if (this.state !== "playing") return;

    const data = this.charactersData[Phaser.Math.Between(0, this.charactersData.length - 1)];
    const ZONE_COUNT = 10;
    const zoneWidth = GAME_WIDTH / ZONE_COUNT;

    if (!this.zonePool || this.zonePool.length === 0) {
      this.zonePool = Phaser.Utils.Array.NumberArray(0, ZONE_COUNT - 1);
      Phaser.Utils.Array.Shuffle(this.zonePool);
    }

    const zoneIndex = this.zonePool.pop();
    const startX = zoneWidth * zoneIndex;
    const endX = startX + zoneWidth;
    const x = Phaser.Math.Between(startX + 100, endX - 100);
    const char = new Character(this, data, x);
    this.characters.push(char);
  }

  spawnWhaleSequence(count) {
    let created = 0;

    const spawnNext = () => {
      if (created >= count) return; // 끝났으면 종료
      created++;
      this.spawnWhale(spawnNext); // 고래 생성, 완료 콜백 전달
    };

    spawnNext(); // 첫 번째 고래 생성 시작
  }

  spawnWhale(onComplete) {
    if (this.whales.length > 0) return;
    const fromLeft = Phaser.Math.Between(0, 1) === 0; // 고래 나오는 방향
    const startX = fromLeft ? -150 : GAME_WIDTH + 150; // 화면 밖 고래
    const midX = fromLeft ? 150 : GAME_WIDTH - 150; // 고래 위치

    const whale = this.matter.add
      .sprite(startX, SHIP_FIXED_Y, "whale", null, {
        isStatic: true,
        label: "whale",
      })
      .setScale(0.3);
    if (fromLeft) whale.setFlipX(true);
    this.whales.push(whale);

    const totalDuration = 7000; // 들어오는 시간 + 대기 + 나가는 시간
    const enterEndTime = 1000; // 애니메이션 시간
    const waitTime = 5000; // 대기 시간

    // 들어오고 나갈 때 애니메이션
    if (!this.anims.exists("whale_anim")) {
      this.anims.create({
        key: "whale_anim",
        frames: this.anims.generateFrameNumbers("whale", { start: 0, end: 1 }),
        frameRate: 2,
        repeat: -1,
      });
    }

    // 분수 애니메이션
    if (!this.anims.exists("whale_spout_anim")) {
      this.anims.create({
        key: "whale_spout_anim",
        frames: this.anims.generateFrameNumbers("whale_spout", { start: 0, end: 1 }),
        frameRate: 2,
        repeat: -1,
      });
    }

    this.tweens.addCounter({
      from: 0,
      to: totalDuration,
      duration: totalDuration,
      ease: "Linear",
      onUpdate: tween => {
        if (!this.whales.includes(whale)) return; // 이미 제거된 고래면 업데이트 무시
        const progressTime = tween.getValue(); // 화면 안으로 들어오는 시간
        const leaveProgressTime = progressTime - enterEndTime - waitTime; // 화면 밖으로 나가는 시간

        if (progressTime < enterEndTime) {
          whale.x = Phaser.Math.Linear(startX, midX, progressTime / enterEndTime); // 화면 안으로 들어오는 구간
          if (!whale.anims.isPlaying || whale.anims.currentAnim.key !== "whale_anim") whale.anims.play("whale_anim");
        } else if (progressTime < enterEndTime + waitTime) {
          whale.x = midX; // 화면 안에서 대기
          if (!whale.anims.isPlaying || whale.anims.currentAnim.key !== "whale_spout_anim") whale.anims.play("whale_spout_anim");
        } else {
          whale.x = Phaser.Math.Linear(midX, startX, leaveProgressTime / 1000); // 화면 밖으로 나가는 구간
          whale.setFlipX(!fromLeft);
          if (!whale.anims.isPlaying || whale.anims.currentAnim.key !== "whale_anim") whale.anims.play("whale_anim");
        }

        // 배 밀기 처리
        const ship = this.ship.sprite;
        const overlapX = Math.abs(whale.x - ship.x) < (whale.displayWidth + ship.displayWidth) / 2;
        if (overlapX) {
          const pushDir = whale.x < ship.x ? 1 : -1;
          ship.setVelocityX(pushDir * 8); // 배가 밀리는 거리
        }
      },
      onComplete: () => {
        if (this.whales.includes(whale)) this.whales = this.whales.filter(w => w !== whale);
        whale.destroy();
        if (onComplete && this.state === "playing") onComplete();
      },
    });
  }

  handleTiltWarning(delta) {
    const angle = this.ship.state.angleDeg;
    const absAngle = Math.abs(angle);
    const tiltDir = angle > 0 ? 1 : angle < 0 ? -1 : 0;

    // 방향이 바뀌면 경고 시간 초기화
    if (tiltDir !== 0 && tiltDir !== this.prevTiltDir) {
      this.tiltTime = 0;
      this.prevTiltDir = tiltDir;
    }

    // 기울기 각도 초과 시
    if (absAngle >= MAX_ANGLE_DEG) {
      this.tiltTime += delta;

      if (!this.warning.isPlaying) {
        this.warning.play();
        this.ship.blinkWarning(true);
      }

      if (this.tiltTime >= 3000) this.gameOver("end");
    } else {
      this.tiltTime = 0;
      this.prevTiltDir = 0;

      if (this.warning.isPlaying) {
        this.warning.stop();
        this.ship.blinkWarning(false);
      }
    }
  }

  updateTimer(delta) {
    if (this.state !== "playing") return;

    this.timer -= delta;
    this.timer = Phaser.Math.Clamp(this.timer, 0, stageTime);
    const ratio = this.timer / stageTime;

    // 진행 바 업데이트
    timerBar.style.width = `${ratio * 100}%`;

    // 10초 카운트
    if (this.timer <= 10000) {
      timerBar.style.background = "#ff4e2b";
      timerBar.classList.add(ACT_ON);
      if (!this.timerSound.isPlaying) this.timerSound.play();
    } else {
      timerBar.style.background = "rgba(0, 125, 157,0.7)";
      timerBar.classList.remove(ACT_ON);
    }

    // 타임업 처리
    if (this.timer <= 0) {
      if (this.ship.state.stageScore + totalScore >= this.targetScore) {
        this.currentStageIndex >= stageTargets.length - 1 ? this.gameOver("final") : this.gameOver("next");
      } else this.gameOver("end");
    }
  }

  // 게임오버 처리
  gameOver(state) {
    this.timerSound.stop();
    this.state = "paused";
    setGameState("gameover", this);
    if (state == "end") {
      this.sound.play("fail");
      this.ship.fallOver();
      this.onShipChars.forEach(onShipChar => onShipChar.fall());
    } else this.sound.play("success");
    this.ship.stop();

    gameOverPop.classList.add(ACT_ON);
    gameOverPop.dataset.state = state;

    // 결과 표시
    resultNumber.textContent = `${this.currentStageIndex + 1}`;

    if (state === "end") {
      this.currentStageIndex = 0;
      resultScore.textContent = this.ship.state.stageScore + totalScore;
    } else {
      resultScore.textContent = totalScore + this.ship.state.stageScore;
      totalScore += this.ship.state.stageScore;
      if (state === "final") {
        console.log("모든 게임 완료");
        this.currentStageIndex = 0;
      }
    }
  }

  reset() {
    if (this.charTimer) {
      this.charTimer.remove();
      this.charTimer = null;
    }

    this.characters.forEach(character => character.destroy());
    this.characters = [];
    this.onShipChars = [];
    this.tweens.killAll();
    this.whales.forEach(w => w.destroy());
    this.whales = [];
    this.tiltTime = 0;
    this.timer = stageTime;
    this.ship.reset();
    quizzButtons.forEach(quizzButton => quizzButton.classList.remove("correct", "incorrect"));
    gameOverPop.classList.remove(ACT_ON);
    quizMarketPop.classList.remove(ACT_ON);
    quizPop.classList.remove(ACT_ON);
    this.boostActive = false;
    this.boostTimer = 0;
    boostItem.classList.remove(ACT_ON);
    if (this.timerSound.isPlaying) this.timerSound.stop();
  }
}

class Ship {
  constructor(scene, x, y, shipShapes) {
    this.scene = scene;
    // 배 생성 상태
    this.sprite = scene.matter.add.sprite(x, y, "ship", 0, { shape: shipShapes.ship }).setScale(0.5).setDepth(10);
    this.state = { leftTorque: 0, rightTorque: 0, angleDeg: 0, stageScore: 0 };
    this.prevDir = 0; // 이전 방향 저장

    // 경고등 생성
    this.warningLight = scene.add.sprite(x, y - 60, "warningLight");
    this.warningLight.setScale(0.5);
    this.warningLight.setDepth(10);
    this.warningLight.offsetX = -10; // 초기값
    this.warningBlinkTimer = null;
    this.isBlinkOn = false;

    //부스트 날개 생성
    this.boostWing = scene.add.sprite(x, y, "boostWing");
    this.boostWing.setScale(0.1);
    this.boostWing.setDepth(10);
    this.boostWing.setFlipX(true);
    this.boostWing.offsetX = -10; // 초기값
  }

  blinkWarning(state) {
    if (state) {
      if (!this.warningBlinkTimer) {
        this.warningBlinkTimer = this.scene.time.addEvent({
          delay: 200, // 0.2초
          loop: true,
          callback: () => {
            this.isBlinkOn = !this.isBlinkOn;
            this.warningLight.setTexture(this.isBlinkOn ? "warningLightOn" : "warningLight");
          },
        });
      }
    } else {
      if (this.warningBlinkTimer) {
        this.warningBlinkTimer.remove(false);
        this.warningLight.setTexture("warningLight");
        this.warningBlinkTimer = null;
        this.isBlinkOn = false;
      }
    }
  }

  // 배 좌우 이동
  move(dir, maxSpeed) {
    const v = this.sprite.body.velocity.x;
    if (dir) {
      const accelStep = this.scene.boostActive ? ACCEL_STEP * this.scene.boostMultiplier : ACCEL_STEP;
      this.sprite.setVelocityX(Phaser.Math.Clamp(v + dir * accelStep, -maxSpeed, maxSpeed));

      // 방향이 바뀌었을 때만 사운드 재생, 경고등 x값 변경
      if (dir !== this.prevDir) {
        this.scene.shipCreak.play({ rate: Phaser.Math.FloatBetween(0.95, 1.05) });
        this.prevDir = dir;

        if (dir === 1) {
          this.warningLight.offsetX = -10;
          this.boostWing.offsetX = -10;
          this.boostWing.setFlipX(true);
        } else if (dir === -1) {
          this.warningLight.offsetX = 10;
          this.boostWing.offsetX = 10;
          this.boostWing.setFlipX(false);
        }
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
    this.state.stageScore = total;
  }

  // 배 기울기 적용
  applyTilt() {
    this.sprite.angle = Phaser.Math.Linear(this.sprite.angle, this.state.angleDeg, 0.1);
    this.updateWarningLight();
  }

  // 배가 넘어지는 애니메이션
  fallOver() {
    const ship = this.sprite;
    this.scene.tweens.add({
      targets: ship,
      angle: this.state.leftTorque > this.state.rightTorque ? -180 : 180,
      duration: 1000,
      ease: "Sine.easeIn",
      onUpdate: () => this.updateWarningLight(),
    });
  }

  updateWarningLight() {
    this.updateChildObject(this.warningLight, -60);
    this.updateChildObject(this.boostWing, -10);
  }

  updateChildObject(target, baseY) {
    if (!target) return;
    const angleRad = Phaser.Math.DegToRad(this.sprite.angle);
    const offsetX = target.offsetX ?? -10;
    const rotatedX = offsetX * Math.cos(angleRad) - baseY * Math.sin(angleRad);
    const rotatedY = offsetX * Math.sin(angleRad) + baseY * Math.cos(angleRad);
    target.x = this.sprite.x + rotatedX;
    target.y = this.sprite.y + rotatedY;
    target.angle = this.sprite.angle;
  }

  stop() {
    this.sprite.setVelocity(0, 0);
    this.sprite.setAngularVelocity(0);
  }

  reset() {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setPosition(GAME_WIDTH / 2, SHIP_FIXED_Y);
    this.sprite.setAngle(0);
    this.blinkWarning(false);
  }
}

class Character {
  constructor(scene, data, x) {
    this.scene = scene;
    this.obj = scene.add.sprite(x, -50, data.key).setScale(0.2).setDepth(1);
    this.weight = data.weight;
    this.onShip = false;
    this.onGround = false;
    this.relativeX = 0;
    this.data = data;

    // 점수 텍스트
    this.scoreText = scene.add
      .text(this.obj.x, this.obj.y - 50, `+${this.weight}`, {
        font: "24px Arial",
        fill: "#834ef5",
        stroke: "#000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0); // 처음엔 안보이게

    // 좌우 흔들림 설정
    this.sway = {
      amplitude: Phaser.Math.Between(30, 80), // 좌우 이동 최대 거리
      speed: Phaser.Math.FloatBetween(0.001, 0.004), // 흔들리는 속도
      offset: Phaser.Math.FloatBetween(0, Math.PI * 2), // 시작 각
    };
  }

  // 캐릭터 위치 업데이트 (낙하, 배 위, 좌우 흔들림)
  update(ship) {
    const shipTop = ship.sprite.y - 10;

    if (!this.onShip && !this.onGround) {
      this.obj.y += 2 + this.weight * 0.01; // 낙하 속도 (무게 반영)
      this.obj.x += Math.sin(performance.now() * this.sway.speed + this.sway.offset) * this.sway.amplitude * 0.05; // 좌우 흔들림 (사인 + 랜덤 속도)
      this.obj.x = Phaser.Math.Clamp(this.obj.x, 0 + 50, GAME_WIDTH - 50); // 화면 밖으로 못 나가게 제한

      // 낙하 스케일 점점 줄이기
      const minScale = 0.08; // 최소 스케일
      if (this.obj.scaleX > minScale) {
        this.obj.setScale(this.obj.scaleX - 0.0002); // 프레임마다 조금씩 줄이기
        this.obj.setDepth(15);
      }

      const shipLeft = ship.sprite.x - ship.sprite.displayWidth / 2;
      const shipRight = ship.sprite.x + ship.sprite.displayWidth / 2;

      if (this.obj.y + this.obj.displayHeight >= SHIP_FIXED_Y && this.obj.x >= shipLeft + 20 && this.obj.x <= shipRight - 20) {
        // 배 위
        this.onShip = true;
        this.scene.onShipChars.push(this);
        this.relativeX = this.obj.x - ship.sprite.x;
        this.obj.y = shipTop - this.obj.displayHeight / 2;
        this.obj.setScale(0.2); // 배 위 스케일 적용
        this.obj.setDepth(5);
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

class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    this.load.image("logo", `assets/icecandy_logo.png`);
  }

  create() {
    const { width, height } = this.scale;

    // 화면 전체를 덮는 배경
    const bg = this.add.rectangle(0, 0, width, height, 0xc9effa).setOrigin(0, 0);

    // 아이스캔디 로고 생성
    const logo = this.add.image(width / 2, height / 2, "logo").setAlpha(0);
    logo.setY(logo.y + 100);

    this.tweens.add({
      targets: logo,
      alpha: 1,
      y: "-=120",
      duration: 150,
      ease: "ease-in-out",
      repeat: 0,
      onComplete: () => {
        this.tweens.add({
          targets: logo,
          alpha: 1,
          y: "+=20",
          duration: 100,
          ease: "ease-in-out",
          repeat: 0,
        });
      },
    });

    this.time.delayedCall(1200, () => {
      this.tweens.add({
        targets: logo,
        alpha: 0,
        duration: 200,
        ease: "ease-in-out",
        repeat: 0,
      });
      this.tweens.add({
        targets: bg,
        alpha: 0,
        duration: 200,
        ease: "ease-in-out",
        repeat: 0,
      });
    });

    this.time.delayedCall(1500, () => {
      setGameState("loadingScene");
      this.scene.start("LoadingScene");
    });
  }
}

class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: "LoadingScene" });
    this.charactersData = charactersData;
  }

  preload() {
    this.load.image("loding", "assets/loding.png");
    this.load.image("bg", "assets/bg.png");
    this.load.image("wave", "assets/game_wave.png");
    this.load.audio("success", "assets/media/success.mp3");
    this.load.audio("timer", "assets/media/timer.mp3");
    this.load.audio("fail", "assets/media/fail.mp3");
    this.load.audio("correct", "assets/media/correct.mp3");
    this.load.audio("incorrect", "assets/media/incorrect.mp3");
    this.load.audio("swim", "assets/media/swim.mp3");
    this.load.audio("shipCreak", "assets/media/splash.mp3");
    this.load.audio("warning", "assets/media/warning.mp3");
    this.load.image("warningLight", "assets/game_timer_default.png");
    this.load.image("warningLightOn", "assets/game_timer_on.png");
    this.load.spritesheet("ship", "assets/ship.png", { frameWidth: 565, frameHeight: 173 });
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
    this.load.spritesheet("whale", "assets/whale.png", {
      frameWidth: 657,
      frameHeight: 420,
    });
    this.load.spritesheet("whale_spout", "assets/whale_spout.png", {
      frameWidth: 669,
      frameHeight: 550,
    });

    this.load.spritesheet("boostWing", "assets/whale_spout.png", {
      frameWidth: 669,
      frameHeight: 550,
    });

    this.load.on("progress", value => {
      loadingBar.style.width = `${value * 100}%`;
      loadingBoat.style.left = `calc(${value * 100}% - ${loadingBoat.offsetWidth * value}px)`;
    });

    this.load.spritesheet("whale", "assets/whale.png", {
      frameWidth: 657,
      frameHeight: 420,
    });

    this.load.on("complete", () => {
      this.time.delayedCall(500, () => {
        setGameState("mainScene");
        this.scene.start("MainMenuScene");
      });
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: 0xc9effa,
  parent: "wrap",
  physics: { default: "matter", matter: { debug: false, gravity: { y: 0 } } },
  scene: [Boot, LoadingScene, MainMenuScene, GameScene],
};

new Phaser.Game(config);
