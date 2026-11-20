// The cover renderer for Leonida Cover Studio.
//
// drawCover paints a complete game-cover composition onto a 2D canvas at
// whatever pixel size the caller set: framed photo panels with colour
// grades, a bold masthead title, a tagline, an age badge and a barcode —
// the finishing furniture of real cover art. The editor's live preview and
// the exported PNG are the same drawing, so what you see is what you post.

const INK = '#0e0c12';
const KEYLINE = '#f3ecd9';
const TITLE_FONT = '"Arial Black", "Archivo Black", Impact, "Liberation Sans", sans-serif';

// --- photo placement -------------------------------------------------------

// Draw an image so it covers the target box, positioned by a focal point
// (fx, fy in 0..1 across the slack) and a zoom factor over the cover fit.
function drawPhotoCover(ctx, img, box, fx, fy, zoom) {
  const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) * zoom;
  const drawnW = img.naturalWidth * scale;
  const drawnH = img.naturalHeight * scale;
  const dx = box.x + (box.w - drawnW) * fx;
  const dy = box.y + (box.h - drawnH) * fy;
  ctx.drawImage(img, dx, dy, drawnW, drawnH);
}

// A panel with no photo yet: a dusk gradient and a quiet instruction.
function drawEmptyPanel(ctx, box, index) {
  const grad = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  grad.addColorStop(0, '#3b1d5e');
  grad.addColorStop(0.55, '#8a2a6b');
  grad.addColorStop(1, '#0f4c5c');
  ctx.fillStyle = grad;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = 'rgba(255, 247, 234, 0.85)';
  ctx.font = `700 ${Math.max(15, box.w * 0.055)}px "Liberation Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PANEL ${index + 1} — ADD A PHOTO`, box.x + box.w / 2, box.y + box.h / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// --- colour grades ---------------------------------------------------------

const GRADE_FILTERS = {
  sunset: 'saturate(1.28) contrast(1.06)',
  neon: 'saturate(1.4) contrast(1.08)',
  gold: 'sepia(0.32) saturate(1.22) contrast(1.04)',
  noir: 'grayscale(1) contrast(1.14)',
  clean: 'none',
};

// A translucent wash laid over the photo, per grade. Stops are
// [offset, rgba] pairs along the panel's vertical axis unless noted.
function gradeWash(ctx, box, grade) {
  let stops = null;
  let horizontal = false;
  if (grade === 'sunset') {
    stops = [[0, 'rgba(255, 110, 64, 0.30)'], [0.45, 'rgba(255, 45, 120, 0.10)'], [1, 'rgba(28, 0, 58, 0.40)']];
  } else if (grade === 'neon') {
    stops = [[0, 'rgba(255, 43, 214, 0.24)'], [0.5, 'rgba(90, 0, 140, 0.05)'], [1, 'rgba(34, 211, 238, 0.26)']];
    horizontal = true;
  } else if (grade === 'gold') {
    stops = [[0, 'rgba(255, 196, 64, 0.18)'], [0.6, 'rgba(255, 140, 40, 0.05)'], [1, 'rgba(112, 44, 0, 0.30)']];
  } else if (grade === 'noir') {
    stops = [[0, 'rgba(0, 0, 0, 0.05)'], [1, 'rgba(0, 0, 0, 0.34)']];
  } else {
    stops = [[0, 'rgba(0, 0, 0, 0)'], [1, 'rgba(0, 0, 0, 0.12)']];
  }
  const grad = horizontal
    ? ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y)
    : ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.h);
  for (const [offset, colour] of stops) grad.addColorStop(offset, colour);
  ctx.fillStyle = grad;
  ctx.fillRect(box.x, box.y, box.w, box.h);
}

// --- one panel -------------------------------------------------------------

function drawPanel(ctx, box, setting, photos, index) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  const img = photos[setting.photo];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.filter = GRADE_FILTERS[setting.grade] ?? 'none';
    drawPhotoCover(ctx, img, box, setting.fx, setting.fy, setting.zoom);
    ctx.filter = 'none';
    gradeWash(ctx, box, setting.grade);
    // A whisper of gloss across the top of the panel, like light
    // catching a printed cover under a shop window.
    const gloss = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.h * 0.55);
    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(box.x, box.y, box.w, box.h * 0.55);
  } else {
    drawEmptyPanel(ctx, box, index);
  }
  ctx.restore();
  // Keyline frame and a dark inner edge, like the white gutters of a
  // printed multi-panel cover.
  ctx.lineWidth = Math.max(3, box.w * 0.012);
  ctx.strokeStyle = KEYLINE;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(10, 6, 4, 0.55)';
  const inset = Math.max(3, box.w * 0.012) + 2;
  ctx.strokeRect(box.x + inset, box.y + inset, box.w - inset * 2, box.h - inset * 2);
}

// --- masthead and footer ---------------------------------------------------

// Split the title into at most two lines that fit the cover's width.
function wrapTitle(ctx, title, maxWidth, startSize) {
  let size = startSize;
  const words = title.split(/\s+/).filter(Boolean);
  const fits = (lines) => lines.every((line) => ctx.measureText(line).width <= maxWidth);
  while (size > 24) {
    ctx.font = `italic 900 ${size}px ${TITLE_FONT}`;
    if (words.length === 1) {
      if (fits(words)) return { lines: words, size };
    } else {
      // Greedy two-line split at the most balanced word boundary.
      let best = null;
      for (let cut = 1; cut < words.length; cut += 1) {
        const lines = [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
        if (fits(lines)) {
          const balance = Math.abs(ctx.measureText(lines[0]).width - ctx.measureText(lines[1]).width);
          if (!best || balance < best.balance) best = { lines, balance };
        }
      }
      if (best) return { lines: best.lines, size };
      if (fits([title])) return { lines: [title], size };
    }
    size *= 0.92;
  }
  ctx.font = `italic 900 ${size}px ${TITLE_FONT}`;
  return { lines: [title], size };
}

function drawMasthead(ctx, W, H, title, tagline) {
  // Scrim so lettering holds over bright photos.
  const scrimH = H * 0.30;
  const scrim = ctx.createLinearGradient(0, 0, 0, scrimH);
  scrim.addColorStop(0, 'rgba(8, 4, 10, 0.62)');
  scrim.addColorStop(1, 'rgba(8, 4, 10, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, scrimH);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd9a0';
  const kickerSize = Math.max(15, W * 0.021);
  ctx.font = `700 ${kickerSize}px "Liberation Sans", sans-serif`;
  try { ctx.letterSpacing = `${Math.round(kickerSize * 0.42)}px`; } catch { /* older engines */ }
  ctx.fillText('L E O N I D A   C O V E R   S T U D I O', W / 2, H * 0.048);
  try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }

  const { lines, size } = wrapTitle(ctx, title || 'UNTITLED', W * 0.92, W * 0.128);
  const lineHeight = size * 1.04;
  let y = H * 0.062 + size;
  for (const line of lines) {
    ctx.font = `italic 900 ${size}px ${TITLE_FONT}`;
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = '#1b0f08';
    ctx.fillStyle = '#160a04';
    ctx.fillText(line, W / 2 + size * 0.045, y + size * 0.05);
    ctx.strokeText(line, W / 2, y);
    ctx.fillStyle = '#fff7ea';
    ctx.fillText(line, W / 2, y);
    y += lineHeight;
  }
  // Hot underline bar under the last line.
  const lastWidth = ctx.measureText(lines[lines.length - 1]).width;
  const barGrad = ctx.createLinearGradient(W / 2 - lastWidth / 2, 0, W / 2 + lastWidth / 2, 0);
  barGrad.addColorStop(0, '#ff5e3a');
  barGrad.addColorStop(0.55, '#ff2e88');
  barGrad.addColorStop(1, '#22d3ee');
  ctx.fillStyle = barGrad;
  ctx.fillRect(W / 2 - lastWidth / 2, y - lineHeight + size * 0.16, lastWidth, size * 0.085);
  ctx.textAlign = 'left';

  if (tagline) {
    ctx.font = `700 ${Math.max(16, W * 0.026)}px "Liberation Sans", sans-serif`;
    ctx.fillStyle = '#ffe9c9';
    ctx.strokeStyle = 'rgba(10, 5, 2, 0.8)';
    ctx.lineWidth = 5;
    const ty = H * 0.962;
    ctx.strokeText(tagline.toUpperCase(), W * 0.032, ty);
    ctx.fillText(tagline.toUpperCase(), W * 0.032, ty);
  }
}

// A small generic age badge of our own drawing: black box, white ring,
// "18+" and a plain-words warning. Not any rating board's mark.
function drawBadge(ctx, W, H) {
  const s = W * 0.088;
  const x = W * 0.030;
  const y = H - s - H * 0.075;
  ctx.fillStyle = '#f7f3e8';
  ctx.fillRect(x, y, s, s);
  ctx.lineWidth = Math.max(3, s * 0.045);
  ctx.strokeStyle = '#111111';
  ctx.strokeRect(x, y, s, s);
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  ctx.font = `900 ${s * 0.44}px "Arial Black", Impact, sans-serif`;
  ctx.fillText('18+', x + s / 2, y + s * 0.52);
  ctx.font = `700 ${s * 0.115}px "Liberation Sans", sans-serif`;
  ctx.fillText('ADULTS ONLY', x + s / 2, y + s * 0.74);
  ctx.font = `700 ${s * 0.10}px "Liberation Sans", sans-serif`;
  ctx.fillText('VICE COAST', x + s / 2, y + s * 0.88);
  ctx.textAlign = 'left';
}

// Barcode bars from a tiny hash of the title, so a cover's code is its own.
function drawBarcode(ctx, W, H, seedText) {
  let hash = 7;
  for (const ch of seedText) hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
  const bw = W * 0.155;
  const bh = H * 0.052;
  const x = W - bw - W * 0.030;
  const y = H - bh - H * 0.032;
  ctx.fillStyle = '#f7f3e8';
  ctx.fillRect(x, y, bw, bh);
  ctx.fillStyle = '#111111';
  let cursor = x + bw * 0.05;
  let n = hash;
  while (cursor < x + bw * 0.92) {
    n = (n * 37 + 11) % 89;
    const barW = 1 + (n % 4);
    if (n % 3 !== 0) ctx.fillRect(cursor, y + bh * 0.10, barW, bh * 0.66);
    cursor += barW + 2;
  }
  ctx.font = `700 ${bh * 0.20}px "Liberation Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('LEONIDA No. 06', x + bw / 2, y + bh * 0.93);
  ctx.textAlign = 'left';
}

// --- the whole cover -------------------------------------------------------

// view: { width, height, rects, panels, photos, title, tagline,
//         showBadge, showBarcode }
export function drawCover(ctx, view) {
  const { width: W, height: H, rects, panels, photos } = view;
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);
  const gutter = Math.max(6, W * 0.011);
  rects.forEach((rect, i) => {
    const box = {
      x: rect[0] * W + gutter / 2,
      y: rect[1] * H + gutter / 2,
      w: rect[2] * W - gutter,
      h: rect[3] * H - gutter,
    };
    drawPanel(ctx, box, panels[i] ?? { photo: 0, grade: 'clean', fx: 0.5, fy: 0.4, zoom: 1 }, photos, i);
  });
  drawMasthead(ctx, W, H, view.title, view.tagline);
  if (view.showBadge) drawBadge(ctx, W, H);
  if (view.showBarcode) drawBarcode(ctx, W, H, view.title || 'LEONIDA');
}
