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
        isDragging = true;

        // 캐릭터(sprite)만 처리
        if (!(gameObject instanceof Phaser.Physics.Arcade.Sprite)) return;

        // 배 위인지 확인
        const isOnShip = gameObject.onShip === true;

        // 드래그 가능 여부 결정
        const canDrag = isOnShip || (!isOnShip && ship.x === 150);
        this.input.setDraggable(gameObject, canDrag);

        if (!canDrag) return;

        // 드래그 시작 시 항상 중력 끄기, 움직임 고정
        gameObject.body.setAllowGravity(false);
        gameObject.body.setVelocity(0);
        gameObject.body.setImmovable(true);
      });

      // 드래그 중 이벤트
      this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
        if (gameObject === ship) {
          // 배 드래그 
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
              gameObject.y = dragY;
              gameObject.relativeX = clampedX - ship.x;

              updateShipTilt(this);
            }
          } else {
            // 배 위 캐릭터 드래그 처리
            const shipEnd = ship.x === 650;
            const shipLeft = ship.x - ship.displayWidth / 2;
            const shipRight = shipEnd ? island.x + island.displayWidth / 2 : ship.x + ship.displayWidth / 2;
            const shipTop = ship.y - ship.displayHeight;
            const shipBottom = ship.y + ship.displayHeight;

            const clampedX = Phaser.Math.Clamp(dragX, shipLeft, shipRight);
            const clampedY = (shipEnd && clampedX > 650) ? dragY : Phaser.Math.Clamp(dragY, shipTop, shipBottom);

            gameObject.x = clampedX;
            gameObject.y = clampedY;
            gameObject.relativeX = clampedX - ship.x;

            if (!shipEnd) updateShipTilt(this);
          }
        }
      });

      // 드래그 종료 이벤트
      this.input.on("dragend", (pointer, gameObject) => {
        isDragging = false;
        if (gameObject === ship) return;

        if (gameObject.onShip) {
          gameObject.onShip = false;
          gameObject.onIsland = true;

          gameObject.body.setAllowGravity(true);
          gameObject.body.setImmovable(false);

          gameObject.relativeXOnIsland = gameObject.x - island.x;
          gameObject.relativeYOnIsland = gameObject.y - island.y;

          console.log(`${gameObject.texture.key}가 섬 위로 이동했습니다.`);

          // 배 기울기 다시 계산 (섬 캐릭터 제외됨)
          updateShipTilt(this);
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