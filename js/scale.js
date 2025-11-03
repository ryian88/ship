export function initScale(element) {
  function getContainerSize() {
    return {
      width: document.body.clientWidth,
      height: document.body.clientHeight,
    };
  }

  function getZoomRate({containerSize, target}) {
    const containerWidth = containerSize.width;
    const containerHeight = containerSize.height;
    const horizontalValue = containerWidth / target.width;
    const verticalValue = containerHeight / target.height;

    return target.width * verticalValue > containerWidth ? horizontalValue : verticalValue;
  }

  function getLeftValue({containerSize, target, zoomRate}) {
    return (containerSize.width - target.width * zoomRate) / 2;
  }

  function getTopValue({containerSize, target, zoomRate}) {
    return (containerSize.height - target.height * zoomRate) / 2;
  }

  function setTransform({zoomRate, leftValue, topValue, element}) {
    const style = element.style;

    style.transform = `scale(${zoomRate})`;
    style.MsTransform = `scale(${zoomRate})`;
    style.MozTransform = `scale(${zoomRate})`;
    style.WebkitTransform = `scale(${zoomRate})`;

    style.transformOrigin = '0% 0%';
    style.MsTransformOrigin = '0% 0%';
    style.MozTransformOrigin = '0% 0%';
    style.WebkitTransformOrigin = '0% 0%';

    style.left = `${leftValue}px`;
    style.top = `${topValue}px`;
  }

  const target = {
    width: element.clientWidth,
    height: element.clientHeight,
  };

  const setScale = () => {
  const containerSize = getContainerSize();
  const zoomRate = getZoomRate({containerSize, target});
  const leftValue = getLeftValue({containerSize, target, zoomRate});
  const topValue = getTopValue({containerSize, target, zoomRate});

  setTransform({zoomRate, leftValue, topValue, element});
  };

  setScale();
  window.addEventListener('resize', setScale);
}