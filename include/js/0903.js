// 퀴즈, 캐릭터 이미지 변환 테스트

document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.querySelector(".start");
  const retryButton = document.querySelector(".retry");
  const gameOverText = document.querySelector(".gameOverText");

  const speedText = document.querySelector(".speedText");
  const hud = document.querySelector(".hud");

  const quizWrap = document.querySelector(".quizWrap");

  const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    physics: {
      default: "matter",
      matter: { debug: true, gravity: { y: 0 } },
    },
    scene: { preload, create, update },
  };

  const game = new Phaser.Game(config);

  let ship;
  let cursors;
  let characters = [];
  let charIndex = 0;
  let lastWeight = null;
  let lastAngle = null;
  let isGameOver = false;
  let tiltTime = 0; // 30도 이상 유지 시간(ms)
  let gameStarted = false; // 게임 상태일때만 배 움직일수있게
  let tiltGamma = 0; // 모바일 기울기 값
  let currentQuizIndex = 0;
  let warningOverlay;

  const maxAngleDeg = 60; // 최대 기울기
  const fixedY = config.height - 160; // 배 고정 y
  const maxSpeed = 10; // 배 최대 속도
  const accelStep = 0.2; // 프레임당 속도 증가량

  function isMobile() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
  }

  const charactersData = [
    { key: "char1", weight: 900, name: "elephant" },
    { key: "char2", weight: 700, name: "giraffe" },
    { key: "char3", weight: 800, name: "hippo" },
    { key: "char4", weight: 300, name: "monkey" },
    { key: "char5", weight: 500, name: "panda" },
    { key: "char6", weight: 100, name: "parrot" },
    { key: "char7", weight: 150, name: "penguin" },
    { key: "char8", weight: 400, name: "pig" },
    { key: "char9", weight: 200, name: "rabbit" },
    { key: "char10", weight: 250, name: "snake" },
  ];

  const quizData = [
    { question: "5 + 3 = ?", answer: "8" },
    { question: "10 - 7 = ?", answer: "3" },
    { question: "6 × 2 = ?", answer: "12" },
    { question: "9 ÷ 3 = ?", answer: "3" },
  ];

  function preload() {
    this.load.image("bg", "assets/bg.png");
    this.load.spritesheet("ship", "assets/ship.png", {
      frameWidth: 853,
      frameHeight: 434,
    });

    charactersData.forEach(char => {
      this.load.image(char.key, "assets/" + char.name + ".png");
      // this.load.spritesheet(char.key + "_on", "assets/" + char.name + "_on.png", {
      //   frameWidth: 310,
      //   frameHeight: 454,
      // });
      // this.load.spritesheet(char.key + "_swim", "assets/" + char.name + "_swim.png", {
      //   frameWidth: 482,
      //   frameHeight: 236,
      // });
    });

    this.load.json("shipPhysics", "assets/ship.json");
  }

  function create() {
    // 화면 밖으로 나가지 못하게
    this.matter.world.setBounds(0, 0, config.width, config.height);

    // 화면 전체 덮는 빨간 오버레이
    warningOverlay = this.add
      .rectangle(0, 0, config.width, config.height, 0xff0000, 0.3)
      .setOrigin(0)
      .setDepth(100) // 최상단 레이어
      .setVisible(false);

    // 배경
    this.add.image(config.width / 2, config.height / 2, "bg").setDisplaySize(config.width, config.height);

    // 배 생성
    const shipShapes = this.cache.json.get("shipPhysics");

    ship = this.matter.add
      .sprite(config.width / 2, fixedY, "ship", 0, { shape: shipShapes.ship }) // 기본은 frame 0
      .setScale(0.3)
      .setDepth(10);

    // PC이면 키보드 조작
    if (!isMobile()) cursors = this.input.keyboard.createCursorKeys();
  }

  function update(time, delta) {
    if (isGameOver || !gameStarted) return;

    // 배 y 고정
    ship.y = fixedY;

    // 배 좌우 이동
    let dir = 0;
    if (isMobile()) {
      // 모바일이면 기울기 값으로 좌우 이동
      if (Math.abs(tiltGamma) > 5) dir = tiltGamma > 0 ? 1 : -1;
    } else dir = (cursors.right.isDown ? 1 : 0) - (cursors.left.isDown ? 1 : 0); // PC면 키보드
    ship.setVelocityX(dir ? Phaser.Math.Clamp(ship.body.velocity.x + dir * accelStep, -maxSpeed, maxSpeed) : ship.body.velocity.x * 0.98);

    // 배 좌우 이미지
    if (dir !== 0) ship.setFrame(dir < 0 ? 1 : 0);

    // 좌측 상단 표시
    speedText.textContent = `속도: ${Math.abs(ship.body.velocity.x).toFixed(2)}`;
    hud.className = `hud ${dir === -1 ? "left" : dir === 1 ? "right" : ""}`;

    characters.forEach(character => {
      const shipTop = ship.y - 10;

      if (!character.onShip && !character.onGround) {
        // 떨어지는 중
        character.obj.y += 2 + character.weight * 0.002; // 무게 따라 속도 차등

        // 좌우 흔들림 (사인 + 랜덤 속도)
        character.obj.x += Math.sin(performance.now() * character.sway.speed + character.sway.offset) * character.sway.amplitude * 0.05;

        // 화면 밖으로 못 나가게 제한
        character.obj.x = Phaser.Math.Clamp(character.obj.x, 0, config.width);

        const shipLeft = ship.x - ship.displayWidth / 2;
        const shipRight = ship.x + ship.displayWidth / 2;

        if (character.obj.y + character.obj.displayHeight >= fixedY && character.obj.x >= shipLeft && character.obj.x <= shipRight) {
          // 배 위
          character.onShip = true;
          character.relativeX = character.obj.x - ship.x;

          character.obj.y = shipTop - character.obj.displayHeight / 2;

          // 애니메이션 변경
          // character.obj.setTexture(character.obj.texture.key + "_on");
          // this.anims.create({
          //   key: character.obj.texture.key + "_anim",
          //   frames: this.anims.generateFrameNumbers(character.obj.texture.key, { start: 0, end: 2 }),
          //   frameRate: 5,
          //   repeat: -1,
          // });
          // character.obj.play(character.obj.texture.key + "_anim");
        } else if (character.obj.y + character.obj.displayHeight >= config.height) {
          // 바닥
          character.onGround = true;
          character.obj.y = config.height - character.obj.displayHeight;

          // 애니메이션으로 변경
          // let startFrame = character.obj.x < config.width / 2 ? 0 : 3;
          // let endFrame = character.obj.x < config.width / 2 ? 2 : 5;

          // character.obj.setTexture(character.obj.texture.key + "_swim");
          // this.anims.create({
          //   key: character.obj.texture.key + "_swim_anim",
          //   frames: this.anims.generateFrameNumbers(character.obj.texture.key, { start: startFrame, end: endFrame }),
          //   frameRate: 5,
          //   repeat: -1,
          // });
          // character.obj.play(character.obj.texture.key + "_swim_anim");

          // 바닥에 있는 캐릭터 좌우로 이동
          moveOffScreen(this, character);
        }
      } else if (character.onShip) {
        // 배 위에서 배 좌우+기울기 반영
        const angleRad = Phaser.Math.DegToRad(ship.angle);
        const rotatedX = character.relativeX * Math.cos(angleRad);
        const rotatedY = character.relativeX * Math.sin(angleRad);
        character.obj.x = ship.x + rotatedX;
        character.obj.y = shipTop - character.obj.displayHeight / 2 + rotatedY;
      }
    });
    updateShipTilt(this, delta);
  }

  function startGame(scene) {
    warningOverlay.setVisible(false);
    gameStarted = true;
    charIndex = 0;
    charactersData.sort(() => Math.random() - 0.5);

    // 초기화
    characters.forEach(character => character.obj.destroy());
    characters = [];
    isGameOver = false;
    tiltTime = 0;
    ship.scene.tweens.killTweensOf(ship);
    ship.setPosition(config.width / 2, fixedY);
    ship.setAngle(0);

    // 모바일이면 기울기 이벤트 등록
    if (isMobile() && window.DeviceOrientationEvent) window.addEventListener("deviceorientation", event => (tiltGamma = event.gamma || 0));

    // 캐릭터 1초마다 생성
    scene.time.addEvent({
      delay: 1000,
      callback: () => createChar(scene),
      repeat: charactersData.length - 1,
    });
  }

  function createChar(scene) {
    if (charIndex >= charactersData.length) return;
    const data = charactersData[charIndex++];
    const x = Phaser.Math.Between(100, config.width - 100);
    const char = scene.add.sprite(x, -50, data.key).setScale(0.1);

    const sway = {
      amplitude: Phaser.Math.Between(15, 50), // 좌우 이동 최대 거리
      speed: Phaser.Math.FloatBetween(0.001, 0.004), // 흔들리는 속도
      direction: Phaser.Math.Between(0, 1) ? 1 : -1, // 시작 방향
      offset: Phaser.Math.FloatBetween(0, Math.PI * 2), // 시작 각
    };
    characters.push({ obj: char, weight: data.weight, onShip: false, onGround: false, relativeX: 0, sway });
  }

  function updateShipTilt(scene, delta) {
    // 배 위에 있는 캐릭터만 필터링
    const onShipChars = characters.filter(character => character.onShip && character.relativeX !== null);

    if (onShipChars.length === 0) {
      scene.tweens.add({ targets: ship, angle: 0, duration: 300, ease: "Sine.easeInOut" });
      return;
    }

    // 무게 중심 계산 (토크 기반)
    let leftTorque = 0;
    let rightTorque = 0;

    onShipChars.forEach(character => {
      if (character.relativeX < 0) leftTorque += Math.abs(character.relativeX) * character.weight;
      else rightTorque += Math.abs(character.relativeX) * character.weight;
    });

    const torqueDiff = rightTorque - leftTorque; // 오른쪽 토크 - 왼쪽 토크
    const angleDeg = Phaser.Math.Clamp(torqueDiff * 0.0005, -maxAngleDeg, maxAngleDeg);

    // 기울기 적용
    scene.tweens.add({ targets: ship, angle: angleDeg, duration: 100, ease: "Sine.easeInOut" });

    // 디버깅 로그
    const totalWeight = onShipChars.reduce((sum, character) => sum + character.weight, 0);

    if (lastAngle !== angleDeg || lastWeight !== totalWeight) {
      console.log(`총무게: ${totalWeight}, 기울기: ${angleDeg.toFixed(2)}도`);
      lastAngle = angleDeg;
      lastWeight = totalWeight;
    }

    // 게임오버 판정
    if (Math.abs(angleDeg) >= 30) {
      tiltTime += delta; // 30도 이상이면 시간 누적

      if (Math.floor(tiltTime / 200) % 2 === 0) warningOverlay.setVisible(true);
      else warningOverlay.setVisible(false);

      if (tiltTime >= 3000) gameOver(scene); // 3초 이상 유지
    } else {
      tiltTime = 0; // 시간 리셋
      warningOverlay.setVisible(false); // 원래 상태
    }
  }

  function gameOver(scene) {
    if (isGameOver) return;
    gameOverText.classList.remove("hidden");
    retryButton.classList.remove("hidden");
    isGameOver = true;
    ship.setVelocity(0, 0);
    ship.setAngularVelocity(0);

    // 배 위 캐릭터 배열
    const onShipChars = characters.filter(character => character.onShip);

    // 배 뒤집힘 각도 계산: 왼쪽 무게 > 오른쪽 무게 -> 왼쪽으로, 아니면 오른쪽
    let leftWeight = 0;
    let rightWeight = 0;
    onShipChars.forEach(character => {
      if (character.relativeX < 0) leftWeight += character.weight;
      else rightWeight += character.weight;
    });
    const rotateAngle = leftWeight > rightWeight ? -180 : 180; // 왼쪽 무거우면 -180, 오른쪽 무거우면 180

    // 배 트윈 (최대 ±180도)
    scene.tweens.add({
      targets: ship,
      angle: Phaser.Math.Clamp(ship.angle + rotateAngle, -180, 180),
      duration: 1000,
      ease: "Sine.easeIn",
    });

    // 캐릭터는 배에서 떨어져 바닥으로 이동
    onShipChars.forEach(character => {
      character.onShip = false; // 배에서 떨어짐
      const targetY = config.height - character.obj.displayHeight; // 바닥 위치
      scene.tweens.add({
        targets: character.obj,
        y: targetY,
        duration: 500 + Math.random() * 300, // 조금씩 차이를 줘서 자연스럽게
        ease: "Sine.easeIn",
        onComplete: () => {
          moveOffScreen(scene, character);
        },
      });
    });

    // 퀴즈 보여주기
    currentQuizIndex = 0;
    showQuiz();
  }

  // 시작 버튼
  startButton.addEventListener("click", () => {
    startButton.classList.add("hidden");

    startGame(game.scene.scenes[0]);
  });

  // 다시하기 버튼
  retryButton.addEventListener("click", () => {
    retryButton.classList.add("hidden");
    gameOverText.classList.add("hidden");
    quizWrap.classList.add("hidden");
    startGame(game.scene.scenes[0]);
  });

  function moveOffScreen(scene, character, moveSpeed = 200) {
    const targetX = character.obj.x < config.width / 2 ? -50 : config.width + 50; // 화면 밖
    const distance = Math.abs(targetX - character.obj.x);
    const duration = (distance / moveSpeed) * 1000;

    scene.tweens.add({
      targets: character.obj,
      x: targetX,
      duration: duration,
      ease: "Linear",
      onComplete: () => {
        character.obj.destroy();
      },
    });
  }

  // 퀴즈 함수
  function showQuiz() {
    const questionDiv = quizWrap.querySelector(".quizQuestion");
    const input = quizWrap.querySelector(".quizInput");
    const submitBtn = quizWrap.querySelector(".quizSubmit");
    const messageDiv = quizWrap.querySelector(".quizMessage");

    quizWrap.classList.remove("hidden");

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
});
