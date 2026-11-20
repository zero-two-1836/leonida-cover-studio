// Panel layouts for Leonida Cover Studio.
//
// Every layout is a list of rectangles in fractions of the cover (x, y, w, h
// measured from the top-left), one set per aspect bucket. The renderer in
// render.js turns these fractions into pixels for whichever export size is
// chosen, so one layout works at 1080 x 1080, 1080 x 1350 and 1920 x 1080.

export const EXPORT_SIZES = {
  square: { label: 'Square · 1080 × 1080', width: 1080, height: 1080, bucket: 'square' },
  portrait: { label: 'Portrait · 1080 × 1350', width: 1080, height: 1350, bucket: 'portrait' },
  wide: { label: 'Wide · 1920 × 1080', width: 1920, height: 1080, bucket: 'wide' },
};

const POSTER = {
  square: [
    [0.00, 0.00, 0.56, 0.54],
    [0.56, 0.00, 0.44, 0.27],
    [0.56, 0.27, 0.44, 0.27],
    [0.00, 0.54, 0.33, 0.46],
    [0.33, 0.54, 0.34, 0.46],
    [0.67, 0.54, 0.33, 0.46],
  ],
  portrait: [
    [0.00, 0.00, 1.00, 0.40],
    [0.00, 0.40, 0.50, 0.30],
    [0.50, 0.40, 0.50, 0.30],
    [0.00, 0.70, 0.34, 0.30],
    [0.34, 0.70, 0.33, 0.30],
    [0.67, 0.70, 0.33, 0.30],
  ],
  wide: [
    [0.00, 0.00, 0.44, 1.00],
    [0.44, 0.00, 0.28, 0.50],
    [0.44, 0.50, 0.28, 0.50],
    [0.72, 0.00, 0.28, 0.50],
    [0.72, 0.50, 0.28, 0.50],
  ],
};

const TRIO = {
  square: [
    [0.00, 0.00, 0.60, 1.00],
    [0.60, 0.00, 0.40, 0.50],
    [0.60, 0.50, 0.40, 0.50],
  ],
  portrait: [
    [0.00, 0.00, 1.00, 0.56],
    [0.00, 0.56, 0.50, 0.44],
    [0.50, 0.56, 0.50, 0.44],
  ],
  wide: [
    [0.00, 0.00, 0.50, 1.00],
    [0.50, 0.00, 0.25, 1.00],
    [0.75, 0.00, 0.25, 1.00],
  ],
};

const QUAD = {
  square: [
    [0.00, 0.00, 0.50, 0.50],
    [0.50, 0.00, 0.50, 0.50],
    [0.00, 0.50, 0.50, 0.50],
    [0.50, 0.50, 0.50, 0.50],
  ],
  portrait: [
    [0.00, 0.00, 0.50, 0.50],
    [0.50, 0.00, 0.50, 0.50],
    [0.00, 0.50, 0.50, 0.50],
    [0.50, 0.50, 0.50, 0.50],
  ],
  wide: [
    [0.00, 0.00, 0.25, 1.00],
    [0.25, 0.00, 0.25, 1.00],
    [0.50, 0.00, 0.25, 1.00],
    [0.75, 0.00, 0.25, 1.00],
  ],
};

const STRIP = {
  square: [
    [0.00, 0.00, 1.00, 0.25],
    [0.00, 0.25, 1.00, 0.25],
    [0.00, 0.50, 1.00, 0.25],
    [0.00, 0.75, 1.00, 0.25],
  ],
  portrait: [
    [0.00, 0.00, 1.00, 0.25],
    [0.00, 0.25, 1.00, 0.25],
    [0.00, 0.50, 1.00, 0.25],
    [0.00, 0.75, 1.00, 0.25],
  ],
  wide: [
    [0.00, 0.00, 0.25, 1.00],
    [0.25, 0.00, 0.25, 1.00],
    [0.50, 0.00, 0.25, 1.00],
    [0.75, 0.00, 0.25, 1.00],
  ],
};

export const LAYOUTS = {
  poster: { label: 'Poster Grid', panels: POSTER },
  trio: { label: 'Hero Trio', panels: TRIO },
  quad: { label: 'Quad Split', panels: QUAD },
  strip: { label: 'Film Strip', panels: STRIP },
};

// Rectangles (in fractions) for a layout at one aspect bucket.
export function panelRects(layoutKey, bucket) {
  const layout = LAYOUTS[layoutKey] ?? LAYOUTS.poster;
  return layout.panels[bucket] ?? layout.panels.square;
}

// The colour grades a panel can carry. render.js knows how to paint each.
export const GRADES = {
  sunset: 'Sunset grade',
  neon: 'Neon grade',
  gold: 'Golden hour',
  noir: 'Noir mono',
  clean: 'Clean photo',
};

const GRADE_CYCLE = ['sunset', 'clean', 'neon', 'gold'];

// A fresh set of per-panel settings for a layout: photos alternate between
// the loaded pictures, grades cycle, every panel starts centred with its
// focal point a touch above the middle, where faces usually are.
export function defaultPanelSettings(count, photoCount) {
  const settings = [];
  for (let i = 0; i < count; i += 1) {
    settings.push({
      photo: photoCount > 0 ? i % photoCount : 0,
      grade: GRADE_CYCLE[i % GRADE_CYCLE.length],
      fx: 0.5,
      fy: 0.38,
      zoom: 1,
    });
  }
  return settings;
}
