// Game rules shared by the extension and the website (and covered by tests).
(() => {
  const BONUS_WAIT = 60000; // free 50 coins once a minute
  const clampLuck = (n) => Math.max(-100, Math.min(100, Math.round(+n) || 0));
  window.PC_RULES = {
    BONUS_WAIT,
    BONUS_AMOUNT: 50,
    clampLuck,
    /** Seconds left before the free coins can be claimed again (0 = claim now). */
    bonusLeft: (bonusAt, now) => Math.max(0, Math.ceil(((bonusAt || 0) + BONUS_WAIT - now) / 1000)),
    /** Chance (0-100) to win a flip with the picked win chance and luck (-100..100). */
    flipOdds: (chance, luck) => {
      const L = clampLuck(luck);
      return L >= 0 ? chance + ((100 - chance) * L) / 100 : chance * (1 + L / 100);
    },
  };
})();
