/**
 * Remembers whether the person last used the mouse (or touch) or the keyboard, as
 * <html data-input="mouse"> or <html data-input="keyboard">.
 *
 * Chrome shows the orange focus ring on a dropdown (<select>) even after a mouse click, and keeps it
 * there until you click somewhere else. index.css hides that ring while data-input="mouse". People
 * using the Tab key still see it, so they always know where they are on the page.
 */
export function trackInputModality(root = document.documentElement) {
  const set = (mode) => {
    if (root.dataset.input !== mode) root.dataset.input = mode;
  };
  set('mouse');
  window.addEventListener('pointerdown', () => set('mouse'), true);
  window.addEventListener(
    'keydown',
    (event) => {
      // Shortcuts like Ctrl+C don't count as keyboard navigation.
      if (!event.ctrlKey && !event.metaKey && !event.altKey) set('keyboard');
    },
    true,
  );
}
