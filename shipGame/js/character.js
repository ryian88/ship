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