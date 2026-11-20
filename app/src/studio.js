// Leonida Cover Studio — the editor.
//
// State lives here; layouts.js describes the panel grids, render.js
// paints them. Every control rewrites a little of the state and asks for
// a repaint, so the canvas on stage is always the cover you would
// export. The two sample photos load at startup: the studio opens on a
// finished cover, and your own photos take their places panel by panel.

import { EXPORT_SIZES, LAYOUTS, GRADES, panelRects, defaultPanelSettings } from './layouts.js';
import { drawCover } from './render.js';
import { SAMPLE_PHOTOS, loadImage, readShotPreset } from './presets.js';

const state = {
  sizeKey: 'portrait',
  layoutKey: 'poster',
  title: 'VICE HARVEST',
  tagline: 'One summer. No way back.',
  showBadge: true,
  showBarcode: true,
  photos: [],
  photoNames: [],
  panels: [],
  activePanel: 0,
};

const el = (id) => document.getElementById(id);
const canvas = el('coverCanvas');
const ctx = canvas.getContext('2d');

function currentSize() {
  return EXPORT_SIZES[state.sizeKey];
}

function currentRects() {
  return panelRects(state.layoutKey, currentSize().bucket);
}

// Rebuild the per-panel settings for the current layout, keeping the
// settings of panels that survive a layout or size change.
function syncPanels() {
  const count = currentRects().length;
  const fresh = defaultPanelSettings(count, state.photos.length);
  state.panels = fresh.map((panel, i) => ({ ...panel, ...(state.panels[i] ?? {}) }));
  if (state.activePanel >= count) state.activePanel = 0;
}

function render() {
  const { width, height } = currentSize();
  canvas.width = width;
  canvas.height = height;
  drawCover(ctx, {
    width,
    height,
    rects: currentRects(),
    panels: state.panels,
    photos: state.photos,
    title: state.title,
    tagline: state.tagline,
    showBadge: state.showBadge,
    showBarcode: state.showBarcode,
  });
}

function setStatus(message) {
  el('statusLine').textContent = message;
}

// --- photos ----------------------------------------------------------------

async function addPhoto(source, name) {
  try {
    const img = await loadImage(source);
    state.photos.push(img);
    state.photoNames.push(name);
    syncPanels();
    buildPhotoSlots();
    buildPanelEditor();
    render();
    setStatus(`${name} loaded — pick a panel and place it.`);
  } catch {
    setStatus(`That file could not be read as a photo.`);
  }
}

function buildPhotoSlots() {
  const wrap = el('photoSlots');
  wrap.innerHTML = '';
  state.photoNames.forEach((name, i) => {
    const row = document.createElement('div');
    row.className = 'photo-row';
    const label = document.createElement('span');
    label.textContent = `${i + 1}. ${name}`;
    const replace = document.createElement('label');
    replace.className = 'mini-button';
    replace.textContent = 'Replace';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      loadImage(url).then((img) => {
        state.photos[i] = img;
        state.photoNames[i] = file.name;
        buildPhotoSlots();
        buildPanelEditor();
        render();
        setStatus(`${file.name} now fills photo slot ${i + 1}.`);
      });
    });
    replace.appendChild(input);
    row.append(label, replace);
    wrap.appendChild(row);
  });
}

// --- layout, size and text controls ----------------------------------------

function buildToggleRow(container, entries, current, onPick) {
  container.innerHTML = '';
  for (const [key, label] of entries) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = key === current ? 'chip chip-on' : 'chip';
    button.textContent = label;
    button.addEventListener('click', () => onPick(key));
    container.appendChild(button);
  }
}

function buildLayoutAndSize() {
  buildToggleRow(
    el('layoutRow'),
    Object.entries(LAYOUTS).map(([key, layout]) => [key, layout.label]),
    state.layoutKey,
    (key) => { state.layoutKey = key; syncPanels(); buildLayoutAndSize(); buildPanelEditor(); render(); },
  );
  buildToggleRow(
    el('sizeRow'),
    Object.entries(EXPORT_SIZES).map(([key, size]) => [key, size.label]),
    state.sizeKey,
    (key) => { state.sizeKey = key; syncPanels(); buildLayoutAndSize(); buildPanelEditor(); render(); },
  );
}

// --- the panel editor --------------------------------------------------------

function buildPanelEditor() {
  const tabs = el('panelTabs');
  tabs.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = i === state.activePanel ? 'chip chip-on' : 'chip';
    button.textContent = `Panel ${i + 1}`;
    button.addEventListener('click', () => { state.activePanel = i; buildPanelEditor(); });
    tabs.appendChild(button);
  });

  const panel = state.panels[state.activePanel];
  if (!panel) return;
  const photoSelect = el('panelPhoto');
  photoSelect.innerHTML = '';
  state.photoNames.forEach((name, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `${i + 1}. ${name}`;
    photoSelect.appendChild(option);
  });
  photoSelect.value = String(Math.min(panel.photo, Math.max(0, state.photos.length - 1)));

  const gradeSelect = el('panelGrade');
  gradeSelect.innerHTML = '';
  for (const [key, label] of Object.entries(GRADES)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = label;
    gradeSelect.appendChild(option);
  }
  gradeSelect.value = panel.grade;

  el('fxRange').value = String(panel.fx);
  el('fyRange').value = String(panel.fy);
  el('zoomRange').value = String(panel.zoom);
  el('fxValue').textContent = `${Math.round(panel.fx * 100)}%`;
  el('fyValue').textContent = `${Math.round(panel.fy * 100)}%`;
  el('zoomValue').textContent = `${panel.zoom.toFixed(2)}×`;
}

function wirePanelEditor() {
  const panel = () => state.panels[state.activePanel];
  el('panelPhoto').addEventListener('change', (event) => {
    panel().photo = Number(event.target.value);
    render();
  });
  el('panelGrade').addEventListener('change', (event) => {
    panel().grade = event.target.value;
    render();
  });
  const bindSlider = (id, valueId, key, format) => {
    el(id).addEventListener('input', (event) => {
      panel()[key] = Number(event.target.value);
      el(valueId).textContent = format(panel()[key]);
      render();
    });
  };
  bindSlider('fxRange', 'fxValue', 'fx', (v) => `${Math.round(v * 100)}%`);
  bindSlider('fyRange', 'fyValue', 'fy', (v) => `${Math.round(v * 100)}%`);
  bindSlider('zoomRange', 'zoomValue', 'zoom', (v) => `${v.toFixed(2)}×`);
  el('gradeAllBtn').addEventListener('click', () => {
    const grade = panel().grade;
    for (const p of state.panels) p.grade = grade;
    render();
    setStatus(`Every panel now carries the ${GRADES[grade].toLowerCase()}.`);
  });
}

// --- export ------------------------------------------------------------------

function exportPng() {
  render();
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const { width, height } = currentSize();
    link.href = url;
    link.download = `leonida-cover-${width}x${height}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setStatus(`Exported a ${width} × ${height} PNG — ready to post.`);
  }, 'image/png');
}

// --- startup -----------------------------------------------------------------

function wireTextControls() {
  el('titleInput').addEventListener('input', (event) => { state.title = event.target.value; render(); });
  el('taglineInput').addEventListener('input', (event) => { state.tagline = event.target.value; render(); });
  el('badgeToggle').addEventListener('change', (event) => { state.showBadge = event.target.checked; render(); });
  el('barcodeToggle').addEventListener('change', (event) => { state.showBarcode = event.target.checked; render(); });
  el('addPhotoInput').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) addPhoto(URL.createObjectURL(file), file.name);
    event.target.value = '';
  });
  for (const button of document.querySelectorAll('.exportBtn')) {
    button.addEventListener('click', exportPng);
  }
}

async function init() {
  const preset = readShotPreset();
  if (preset) {
    if (preset.size && EXPORT_SIZES[preset.size]) state.sizeKey = preset.size;
    if (preset.layout && LAYOUTS[preset.layout]) state.layoutKey = preset.layout;
    if (preset.title) state.title = preset.title;
    if (preset.tagline) state.tagline = preset.tagline;
    if (preset.mode === 'cover') document.body.classList.add('shot-cover');
  }
  el('titleInput').value = state.title;
  el('taglineInput').value = state.tagline;

  wireTextControls();
  wirePanelEditor();
  for (const sample of SAMPLE_PHOTOS) {
    await addPhoto(sample.src, sample.name);
  }
  buildLayoutAndSize();
  buildPanelEditor();
  render();
  setStatus('Samples loaded. Add your own photo, frame the panels, export the PNG.');
}

init();
