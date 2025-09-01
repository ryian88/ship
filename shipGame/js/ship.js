// 배 기울기 및 무게 재계산
function updateShipTilt(scene) {
  const onShipChars = characters.filter(char => char.onShip && char.relativeX !== null);
  const totalWeight = onShipChars.reduce((sum, char) => sum + char.weight, 0);

  if (totalWeight === 0) {
    scene.tweens.add({
      targets: ship,
      angle: 0,
      duration: 300,
      ease: 'Sine.easeInOut',
    });
    console.log('배 위 캐릭터 없음, 각도 0');
    return;
  }

  const weightedSum = onShipChars.reduce((sum, c) => sum + c.relativeX * c.weight, 0);
  const offset = weightedSum / totalWeight;

  const maxAngleDeg = 30;
  const angleDeg = Phaser.Math.Clamp(offset * 0.5, -maxAngleDeg, maxAngleDeg);

  console.log(`배 위 캐릭터들: [${onShipChars.map(c => c.texture.key).join(', ')}]`);
  console.log(`배 위 총 무게: ${totalWeight}`);
  console.log(`배 기울기 각도: ${angleDeg}도`);

  scene.tweens.add({
    targets: ship,
    angle: angleDeg,
    duration: 300,
    ease: 'Sine.easeInOut',
  });
}
