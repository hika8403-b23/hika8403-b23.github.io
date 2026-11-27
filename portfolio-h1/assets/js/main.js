(() => {
  const curtain = document.querySelector('.opening-curtain');
  const leftCurtain = curtain?.querySelector('.curtain-left');
  const rightCurtain = curtain?.querySelector('.curtain-right');
  const skipButton = curtain?.querySelector('.opening-curtain__skip');

  if (!curtain || !leftCurtain || !rightCurtain || !skipButton) {
    throw new Error('Opening curtain elements are missing from the page.');
  }

  const storageKey = 'portfolioOpeningPlayed';
  const root = document.documentElement;
  const previousOverflow = root.style.getPropertyValue('overflow');
  const previousOverflowPriority = root.style.getPropertyPriority('overflow');

  function hasPlayedOpening() {
    try {
      return window.sessionStorage.getItem(storageKey) === 'true';
    } catch (error) {
      console.error('Could not read the opening state from sessionStorage.', error);
      return false;
    }
  }

  function saveOpeningState() {
    try {
      window.sessionStorage.setItem(storageKey, 'true');
    } catch (error) {
      console.error('Could not save the opening state to sessionStorage.', error);
    }
  }

  if (hasPlayedOpening()) {
    curtain.hidden = true;
    return;
  }

  saveOpeningState();
  root.style.setProperty('overflow', 'hidden');

  const finishedCurtains = new Set();
  let isFinished = false;

  function finishOpening() {
    if (isFinished) {
      return;
    }

    isFinished = true;
    curtain.hidden = true;
    leftCurtain.removeEventListener('animationend', onCurtainAnimationEnd);
    rightCurtain.removeEventListener('animationend', onCurtainAnimationEnd);
    skipButton.removeEventListener('click', finishOpening);

    if (previousOverflow) {
      root.style.setProperty('overflow', previousOverflow, previousOverflowPriority);
    } else {
      root.style.removeProperty('overflow');
    }
  }

  function onCurtainAnimationEnd(event) {
    finishedCurtains.add(event.currentTarget);
    if (finishedCurtains.size === 2) {
      finishOpening();
    }
  }

  leftCurtain.addEventListener('animationend', onCurtainAnimationEnd);
  rightCurtain.addEventListener('animationend', onCurtainAnimationEnd);
  skipButton.addEventListener('click', finishOpening);
})();
