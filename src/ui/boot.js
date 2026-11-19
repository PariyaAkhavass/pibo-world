/**
 * Wordless loader. The pot is on screen from the first HTML paint, and again
 * if a room's pictures are still on their way. No letters.
 */
let holds = 1;

function el() {
  return document.getElementById("boot");
}

function paint() {
  el()?.classList.toggle("is-done", holds <= 0);
}

export function showBoot() {
  holds += 1;
  paint();
}

export function hideBoot() {
  holds = Math.max(0, holds - 1);
  paint();
}

/** Show the pot only when the work outlasts a short beat, so a cached room does not flash. */
export function withBoot(work) {
  let shown = false;
  const timer = setTimeout(() => {
    shown = true;
    showBoot();
  }, 80);
  return Promise.resolve()
    .then(work)
    .finally(() => {
      clearTimeout(timer);
      if (shown) hideBoot();
    });
}
