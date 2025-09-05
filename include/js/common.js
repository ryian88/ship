document.addEventListener("DOMContentLoaded", () => {
  const wrap = document.getElementById("wrap");
  const startButton = document.querySelector(".start");
  const retryButton = document.querySelector(".retry");
  const speedText = document.querySelector(".speedText");
  const hud = document.querySelector(".hud");
  const angle = document.querySelector(".angle");
  const weight = document.querySelector(".weight");

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
  let onShipChars = [];
  let charIndex = 0;
  let tiltTime = 0; // 30도 이상 유지 시간(ms)

  let tiltGamma = 0; // 모바일 기울기 값
  let warningOverlay;
  let shipState = { leftTorque: 0, rightTorque: 0, angleDeg: 0, totalWeight: 0 };

  const maxAngleDeg = 30; // 최대 기울기
  const fixedY = config.height - 160; // 배 고정 y
  const maxSpeed = 10; // 배 최대 속도
  const accelStep = 0.2; // 프레임당 속도 증가량

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

  function isMobile() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
  }

  function preload() {
    this.load.image("bg", "assets/bg.png");
    this.load.spritesheet("ship", "assets/ship.png", { frameWidth: 853, frameHeight: 434 });

    charactersData.forEach(char => {
      this.load.image(char.key, "assets/" + char.name + ".png");
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
      .sprite(config.width / 2, fixedY, "ship", 0, { shape: shipShapes.ship })
      .setScale(0.3)
      .setDepth(10);

    // PC이면 키보드 조작
    if (!isMobile()) cursors = this.input.keyboard.createCursorKeys();
  }

  function update(time, delta) {
    if (wrap.dataset.state !== "playing") return;

    // 배 y 고정
    ship.y = fixedY;

    // 배 좌우 이동
    let dir = 0;
    if (isMobile()) {
      // 모바일이면 기울기 값으로 좌우 이동, PC면 키보드
      if (Math.abs(tiltGamma) > 5) dir = tiltGamma > 0 ? 1 : -1;
    } else dir = (cursors.right.isDown ? 1 : 0) - (cursors.left.isDown ? 1 : 0);

    ship.setVelocityX(dir ? Phaser.Math.Clamp(ship.body.velocity.x + dir * accelStep, -maxSpeed, maxSpeed) : ship.body.velocity.x * 0.98);

    // 배 좌우 이미지
    if (dir !== 0) ship.setFrame(dir < 0 ? 1 : 0);

    // HUD
    updateShipState(onShipChars);

    speedText.textContent = `속도: ${Math.abs(ship.body.velocity.x).toFixed(2)}`;
    angle.textContent = `기울기: ${shipState.angleDeg.toFixed(2)}`;
    weight.textContent = `총무게: ${shipState.totalWeight}`;
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
          onShipChars.push(character);
          character.relativeX = character.obj.x - ship.x;

          character.obj.y = shipTop - character.obj.displayHeight / 2;
        } else if (character.obj.y + character.obj.displayHeight >= config.height) {
          // 바닥
          character.onGround = true;
          character.obj.y = config.height - character.obj.displayHeight;
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
    wrap.dataset.state = "playing";
    charIndex = 0;
    charactersData.sort(() => Math.random() - 0.5);
    reset();

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

  // 좌 우 배 무게, 각도 계산
  function updateShipState(characters) {
    let leftTorque = 0;
    let rightTorque = 0;
    characters.forEach(character => {
      const torque = Math.abs(character.relativeX) * character.weight;
      if (character.relativeX < 0) leftTorque += torque;
      else rightTorque += torque;
    });
    const angleDeg = Phaser.Math.Clamp((rightTorque - leftTorque) * 0.0005, -maxAngleDeg, maxAngleDeg);
    const totalWeight = onShipChars.reduce((sum, c) => sum + c.weight, 0);
    shipState.leftTorque = leftTorque;
    shipState.rightTorque = rightTorque;
    shipState.angleDeg = angleDeg;
    shipState.totalWeight = totalWeight;
    return { angleDeg, totalWeight };
  }

  function updateShipTilt(scene, delta) {
    if (onShipChars.length === 0) {
      scene.tweens.add({ targets: ship, angle: 0, duration: 300, ease: "Sine.easeInOut" });
      return;
    }

    // 기울기 적용
    scene.tweens.add({ targets: ship, angle: shipState.angleDeg, duration: 100, ease: "Sine.easeInOut" });

    // 게임오버 판정
    if (Math.abs(shipState.angleDeg) >= maxAngleDeg) {
      tiltTime += delta; // maxAngleDeg도 이상이면 시간 누적

      if (Math.floor(tiltTime / 200) % 2 === 0) warningOverlay.setVisible(true);
      else warningOverlay.setVisible(false);

      if (tiltTime >= 3000) {
        scene.tweens.add({ targets: ship, angle: shipState.leftTorque > shipState.rightTorque ? -180 : 180, duration: 1000, ease: "Sine.easeIn" });
        gameOver(scene); // 3초 이상 유지
      }
    } else {
      tiltTime = 0; // 시간 리셋
      warningOverlay.setVisible(false); // 원래 상태
    }
  }

  function gameOver(scene) {
    wrap.dataset.state = "gameover";
    ship.setVelocity(0, 0);
    ship.setAngularVelocity(0);

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
  }

  // 시작 버튼
  startButton.addEventListener("click", () => startGame(game.scene.scenes[0]));

  // 다시하기 버튼
  retryButton.addEventListener("click", () => startGame(game.scene.scenes[0]));

  // 초기화
  function reset() {
    warningOverlay.setVisible(false);
    characters.forEach(character => character.obj.destroy());
    characters = [];
    onShipChars = [];
    tiltTime = 0;
    ship.scene.tweens.killTweensOf(ship);
    ship.setPosition(config.width / 2, fixedY);
    ship.setAngle(0);
  }

  // 바닥에 떨어진 캐릭터들 좌우 가까운 방향으로 이동
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
});
