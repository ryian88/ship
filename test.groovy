<!DOCTYPE html>
<html lang="ko">

<head>
  <meta charset="UTF-8" />
  <title>배탈출 - 히트박스 충돌</title>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
  <style>
    body {
      margin: 0;
    }
  </style>
</head>

<body>
  <script>
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      backgroundColor: "#87CEEB",
      physics: {
        default: "arcade",
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
      this.load.image("island", "assets/island.png");
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
      this.add.image(400, 300, "bg"); // 배경 추가

      // 배 생성
      ship = this.physics.add.staticImage(150, 550, "ship").setOrigin(0.5, 0).setScale(0.4).refreshBody();
      ship.setInteractive({ draggable: true });

      // 섬 생성      
      island = this.physics.add.staticImage(760, 560, "island").setScale(1);
      island.setOrigin(0.5, 0.5);

      // 캐릭터 생성
      createChar(this);

      // 드래그 시작 이벤트
      this.input.on("dragstart", (pointer, gameObject) => {
        if (gameObject === ship) {
          isDragging = true;
        } else if (!gameObject.onShip) {
          // 처음 생성된 캐릭터는 배가 150일 때만 드래그 허용
          if (ship.x === 150) {
            this.input.setDraggable(gameObject, true);
            isDragging = true;
            gameObject.body.setAllowGravity(false);
            gameObject.body.setVelocity(0);
            gameObject.body.setImmovable(true);
          } else {
            this.input.setDraggable(gameObject, false);
          }
        } else {
          // 배 위 캐릭터는 항상 드래그 허용
          this.input.setDraggable(gameObject, true);
          isDragging = true;
          gameObject.body.setAllowGravity(false);
          gameObject.body.setVelocity(0);
          gameObject.body.setImmovable(true);
        }
      });

      // 드래그 중 이벤트
      this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
        if (gameObject === ship) {
          // 배 드래그 처리 (150~650)
          const clampedX = Phaser.Math.Clamp(dragX, 150, 650);
          const deltaX = clampedX - ship.x;
          ship.x = clampedX;
          ship.refreshBody();

          characters.forEach(char => {
            if (char.onShip && char.relativeX !== null) char.x += deltaX;
          });
          updateShipTilt(this);

        } else {
          if (!gameObject.onShip) {
            // 처음 생성된 캐릭터는 배가 150일 때만 배 영역 내 드래그 가능
            if (ship.x === 150) {
              const shipLeft = ship.x - ship.displayWidth / 2;
              const shipRight = ship.x + ship.displayWidth / 2;
              const shipTop = ship.y - ship.displayHeight;
              const shipBottom = ship.y + ship.displayHeight;

              const clampedX = Phaser.Math.Clamp(dragX, shipLeft, shipRight);
              const clampedY = Phaser.Math.Clamp(dragY, shipTop, shipBottom);

              gameObject.x = clampedX;
              gameObject.y = clampedY;
              gameObject.relativeX = clampedX - ship.x;

              updateShipTilt(this);
            }
          } else {
            // 배 위 캐릭터 드래그 처리

            if (ship.x === 650) {
              // 배가 650일 때는 기울기 계산하지 않음
              const minX = ship.x - ship.displayWidth / 2;
              const maxX = island.x + island.displayWidth / 2;

              const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);

              let clampedY;
              if (clampedX <= 650) {
                const minY = ship.y - ship.displayHeight;
                const maxY = ship.y + ship.displayHeight;
                clampedY = Phaser.Math.Clamp(dragY, minY, maxY);
              } else {
                clampedY = dragY;
              }

              gameObject.x = clampedX;
              gameObject.y = clampedY;
              gameObject.relativeX = clampedX - ship.x;

              // 배 기울기 계산 호출하지 않음
            } else {
              // 배가 650이 아닐 때만 호출
              const shipLeft = ship.x - ship.displayWidth / 2;
              const shipRight = ship.x + ship.displayWidth / 2;
              const shipTop = ship.y - ship.displayHeight;
              const shipBottom = ship.y + ship.displayHeight;

              const clampedX = Phaser.Math.Clamp(dragX, shipLeft, shipRight);
              const clampedY = Phaser.Math.Clamp(dragY, shipTop, shipBottom);

              gameObject.x = clampedX;
              gameObject.y = clampedY;
              gameObject.relativeX = clampedX - ship.x;

              updateShipTilt(this);
            }
          }
        }
      });

      // 드래그 종료 이벤트
      this.input.on("dragend", (pointer, gameObject) => {
        isDragging = false;
        if (gameObject === ship) return;

        // 섬 영역 좌표 계산 (섬 중심 기준)
        const islandLeft = island.x - island.width / 2;
        const islandRight = island.x + island.width / 2;
        const islandTop = island.y - island.height / 2;
        const islandBottom = island.y + island.height / 2;

        if (
          gameObject.x > islandLeft &&
          gameObject.x < islandRight &&
          gameObject.y > islandTop &&
          gameObject.y < islandBottom
        ) {
          // 배 위에서 섬으로 이동 처리
          if (gameObject.onShip) {
            gameObject.onShip = false;
            gameObject.onIsland = true;

            gameObject.body.setAllowGravity(false);
            gameObject.body.setVelocity(0);
            gameObject.body.setImmovable(true);

            gameObject.relativeXOnIsland = gameObject.x - island.x;
            gameObject.relativeYOnIsland = gameObject.y - island.y;

            console.log(`${gameObject.texture.key}가 섬 위로 이동했습니다.`);

            // 배 기울기 다시 계산 (섬 캐릭터 제외됨)
            updateShipTilt(this);
          }
        } else {
          // 섬 밖이면 배 위 상태 유지 또는 중력 활성화
          if (gameObject.onShip) {
            gameObject.body.setAllowGravity(false);
            gameObject.body.setVelocity(0);
            gameObject.body.setImmovable(true);
          } else {
            gameObject.body.setAllowGravity(true);
            gameObject.body.setImmovable(false);
          }
        }
        updateShipTilt(this);          
        this.input.setDraggable(gameObject, true);
      });

      // 배와 캐릭터 충돌 콜백 (배 위에 올라갔을 때)
      this.physics.add.collider(ship, characters, (shipObj, charObj) => {
        if (isDragging || charObj.onShip) return;

        if (charObj.body.touching.down || charObj.body.blocked.down) {
          charObj.onShip = true;
          charObj.onIsland = false;

          charObj.body.setAllowGravity(false);
          charObj.body.setVelocity(0);
          charObj.body.setImmovable(true);

          charObj.relativeX = charObj.x - ship.x;

          console.log(`${charObj.texture.key}가 배 위에 탔습니다.`);

          updateShipTilt(this);
          createChar(this);
        }
      });

      // 섬과 캐릭터 충돌 콜백 (섬 위에 올라갔을 때 위치 고정)
      this.physics.add.collider(island, characters, (islandObj, charObj) => {
        if (!charObj.onIsland) return;

        if (charObj.body.touching.down || charObj.body.blocked.down) {
          charObj.onShip = false;
          charObj.onIsland = true;

          charObj.body.setAllowGravity(false);
          charObj.body.setVelocity(0);
          charObj.body.setImmovable(true);

          console.log(`${charObj.texture.key}가 섬 위에 있습니다.`);

          updateShipTilt(this);
        }
      });

    }

    // 캐릭터 생성
    function createChar(scene) {
      if (currentCharIndex >= charactersData.length) {
        console.log("모든 캐릭터 완료");
        return;
      }
      const data = charactersData[currentCharIndex];
      const char = scene.physics.add.sprite(50, 50, data.key).setInteractive();
      char.setScale(0.1);
      char.setCollideWorldBounds(true);
      char.weight = data.weight;
      char.onShip = false;
      char.onIsland = false;
      char.relativeX = null;

      scene.input.setDraggable(char, true);

      characters.push(char);
      currentCharIndex++;
    }

    // 배 기울기 및 무게 재계산
    function updateShipTilt(scene) {
      const onShipChars = characters.filter(c => c.onShip && c.relativeX !== null);
      const totalWeight = onShipChars.reduce((sum, c) => sum + c.weight, 0);

      if (totalWeight === 0) {
        scene.tweens.add({
          targets: ship,
          angle: 0,
          duration: 300,
          ease: "Sine.easeInOut",
        });
        console.log("배 위 캐릭터 없음, 각도 0");
        return;
      }

      const weightedSum = onShipChars.reduce((sum, c) => sum + c.relativeX * c.weight, 0);
      const offset = weightedSum / totalWeight;

      const maxAngleDeg = 30;
      const angleDeg = Phaser.Math.Clamp(offset * 0.5, -maxAngleDeg, maxAngleDeg);

      console.log(`배 위 캐릭터들: [${onShipChars.map(c => c.texture.key).join(", ")}]`);
      console.log(`배 위 총 무게: ${totalWeight}`);
      console.log(`배 기울기 각도: ${angleDeg}도`);

      scene.tweens.add({
        targets: ship,
        angle: angleDeg,
        duration: 300,
        ease: "Sine.easeInOut",
      });
    }

    // 게임 루프
    function update() {
      if (isDragging) return;

      const angleRad = Phaser.Math.DegToRad(ship.angle);
      const { x: shipX, y: shipY } = ship;

      characters.forEach(char => {
        if (char.onShip && char.relativeX != null) {
          // 배 위 캐릭터 위치 고정 (기울기 반영)
          char.x = shipX + char.relativeX * Math.cos(angleRad);
          char.y = shipY - char.displayHeight / 2 + char.relativeX * Math.sin(angleRad);

          char.body.setVelocity(0);
          char.body.setImmovable(true);
          char.body.setAllowGravity(false);
        } else if (char.onIsland) {
          // 섬 위 캐릭터 위치 고정
          char.x = island.x + char.relativeXOnIsland;
          char.y = island.y + char.relativeYOnIsland;

          char.body.setVelocity(0);
          char.body.setImmovable(true);
          char.body.setAllowGravity(false);
        }
      });
    }
  </script>
</body>

</html>