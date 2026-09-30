// Stops the page behind an open sheet from scrolling. `overflow: hidden` alone
// isn't enough on iPhone Safari, which still scrolls the page when a swipe
// starts outside the sheet or runs past its end, so the page is pinned in
// place and put back where it was on close. Sheets can stack (a category
// editor over the entry form), so only the first lock and last unlock count.

let locks = 0;
let savedY = 0;

export function lockPageScroll(): () => void {
  if (locks++ === 0) {
    savedY = window.scrollY;
    const body = document.body.style;
    body.position = "fixed";
    body.top = `-${savedY}px`;
    body.left = "0";
    body.right = "0";
    body.overflow = "hidden";
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks > 0) return;
    const body = document.body.style;
    body.position = "";
    body.top = "";
    body.left = "";
    body.right = "";
    body.overflow = "";
    window.scrollTo(0, savedY);
  };
}
