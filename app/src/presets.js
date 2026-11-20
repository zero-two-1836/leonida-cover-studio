// Demo content and screenshot presets for Leonida Cover Studio.
//
// The two sample photos ship with the app (they were made for make.fun
// with an image model and are free to use), so the studio opens with a
// finished cover instead of a blank grid. A "?shot=" URL — the ones
// listed in shots.json at the repository root — applies a preset and
// tidies the page for a screenshot: "cover" hides the editor chrome so
// the canvas fills the window, "editor" keeps everything as it is.

export const SAMPLE_PHOTOS = [
  { src: './samples/boulevard.jpg', name: 'Sample photo — boulevard' },
  { src: './samples/pier.jpg', name: 'Sample photo — pier' },
];

// Load an image from a same-folder path or an object URL; resolves with
// the HTMLImageElement once it can be drawn.
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

// The preset named by the page URL, or null for a normal visit.
export function readShotPreset() {
  const query = new URLSearchParams(window.location.search);
  if (!query.has('shot')) return null;
  return {
    mode: query.get('shot'),
    size: query.get('size'),
    layout: query.get('layout'),
    title: query.get('title'),
    tagline: query.get('tagline'),
  };
}
