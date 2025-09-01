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
    }
  });
}