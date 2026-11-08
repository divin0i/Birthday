import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import {
  get,
  getDatabase,
  onValue,
  push,
  ref,
  set,
  update,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";
import {
  DEMO_POLAROID_COUNT,
  GRACE_MS,
  MAX_IMAGE_CHARS,
  MAX_NAME,
  MAX_NOTE,
  PICTURES_PER_PAGE,
  UPLOADS_ENABLED,
} from "./wall-config.js";
import { buildDemoPolaroids, demoCountFromUrl } from "./wall-demo.js";
import {
  isWallImageWarm,
  markWallImageWarm,
  prefetchAroundPage,
  prefetchWallPage,
  wallPhotoSrc,
} from "./wall-prefetch.js";

const firebaseConfig = {
  apiKey: "AIzaSyC6vxDt94oIq9xCUC84XLZReB1YL1K5rqk",
  authDomain: "pack-a0054.firebaseapp.com",
  databaseURL: "https://pack-a0054-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "pack-a0054",
  storageBucket: "pack-a0054.firebasestorage.app",
  messagingSenderId: "211388684424",
  appId: "1:211388684424:web:3afd7319bc586b2ef2673d",
};

const STORE = "scovy-memory-edit";
const RULES_HINT =
  "Firebase a refusé l'envoi. Ouvre Realtime Database → Rules et colle database.rules.json.";

const db = getDatabase(initializeApp(firebaseConfig));

const screens = {
  wall: document.getElementById("screen-wall"),
  upload: document.getElementById("screen-upload"),
  grace: document.getElementById("screen-grace"),
  closed: document.getElementById("screen-closed"),
};

const wallGrid = document.getElementById("wallGrid");
const wallLoader = document.getElementById("wallLoader");
const wallStatus = document.getElementById("wallStatus");
const addLink = document.getElementById("addLink");
const composer = document.getElementById("composer");
const drop = document.getElementById("drop");
const fileInput = document.getElementById("file");
const preview = document.getElementById("preview");
const dropLabel = document.getElementById("dropLabel");
const tiltFrame = document.getElementById("tiltFrame");
const tiltInput = document.getElementById("tilt");
const tiltOut = document.getElementById("tiltOut");
const tiltField = document.getElementById("tiltField");
const dropError = document.getElementById("dropError");
const nameInput = document.getElementById("name");
const noteInput = document.getElementById("note");
const count = document.getElementById("count");
const formError = document.getElementById("formError");
const sendBtn = document.getElementById("send");
const cancelEdit = document.getElementById("cancelEdit");
const graceLede = document.getElementById("graceLede");
const graceKicker = document.getElementById("graceKicker");
const graceTitle = document.getElementById("graceTitle");
const graceStage = document.getElementById("graceStage");
const graceActions = document.getElementById("graceActions");
const timer = document.getElementById("timer");
const timerBar = document.getElementById("timerBar");
const editBtn = document.getElementById("editBtn");
const deleteBtn = document.getElementById("deleteBtn");
const wallBook = document.getElementById("wallBook");
const wallStage = document.getElementById("wallStage");
const pageTitle = document.getElementById("pageTitle");
const pageTitleCount = document.getElementById("pageTitleCount");
const piuFab = document.getElementById("piuFab");
const piuMenu = document.getElementById("piuMenu");
const piuDock = document.getElementById("piuDock");
const actionTurnPage = document.getElementById("actionTurnPage");
const actionGotoToggle = document.getElementById("actionGotoToggle");
const gotoPanel = document.getElementById("gotoPanel");
const gotoPageSelect = document.getElementById("gotoPageSelect");
const gotoApply = document.getElementById("gotoApply");
const actionCreatePage = document.getElementById("actionCreatePage");
const wallCreatePage = document.getElementById("wallCreatePage");
const actionWallEdit = document.getElementById("actionWallEdit");
const wallEditBar = document.getElementById("wallEditBar");
const wallEditHint = document.getElementById("wallEditHint");
const wallEditDone = document.getElementById("wallEditDone");
const wallGraceEdit = document.getElementById("wallGraceEdit");
const noteZoom = document.getElementById("noteZoom");
const noteZoomBackdrop = document.getElementById("noteZoomBackdrop");
const noteZoomImg = document.getElementById("noteZoomImg");
const noteZoomText = document.getElementById("noteZoomText");
const noteZoomSign = document.getElementById("noteZoomSign");
const wallMusic = document.getElementById("wallMusic");
const wallMusicControl = document.getElementById("wallMusicControl");
const wallMusicIcon = document.getElementById("wallMusicIcon");
const wallMusicHint = document.getElementById("wallMusicHint");

const state = {
  screen: "wall",
  image: "",
  editing: null,
  grant: null,
  saving: false,
  deleteArmed: false,
  timer: 0,
  wallSig: "",
  lastWallItems: null,
  tiltDeg: 0,
  wallLoadToken: 0,
  wallLoading: true,
  currentPage: 0,
  editMode: false,
  layouts: {},
  selectedId: null,
  editZ: 24,
  wallMeta: { pageCount: 1, names: {} },
  flippedId: null,
  noteZoomOpen: false,
  wallMusicOn: true,
  placementMode: false,
  placementId: null,
};

let wallBooted = false;
let wallHasPainted = false;
let renderWallTimer = 0;

const uploadRoute = new URLSearchParams(location.search).has("upload");

function showScreen(name) {
  state.screen = name;
  for (const [key, el] of Object.entries(screens)) {
    el.hidden = key !== name;
  }
  if (name === "wall") updatePlacementBar();
  else if (wallEditBar) wallEditBar.hidden = true;
  syncWallMusic();
}

function setWallMusicIcon(playing) {
  if (wallMusicIcon) wallMusicIcon.textContent = playing ? "🔊" : "🔇";
}

function setWallMusicHint(show) {
  if (wallMusicHint) wallMusicHint.hidden = !show;
}

function attemptWallMusicPlay() {
  if (!wallMusic || !state.wallMusicOn || state.screen !== "wall") {
    setWallMusicHint(false);
    return Promise.resolve(false);
  }
  return wallMusic
    .play()
    .then(() => {
      setWallMusicIcon(true);
      setWallMusicHint(false);
      wallMusicControl?.setAttribute("aria-pressed", "true");
      return true;
    })
    .catch(() => {
      setWallMusicIcon(false);
      setWallMusicHint(true);
      return false;
    });
}

function syncWallMusic() {
  if (!wallMusic) return;
  const onWall = state.screen === "wall";
  if (onWall && state.wallMusicOn) {
    attemptWallMusicPlay();
  } else {
    wallMusic.pause();
    setWallMusicHint(false);
    if (!state.wallMusicOn) {
      setWallMusicIcon(false);
      wallMusicControl?.setAttribute("aria-pressed", "false");
    }
  }
}

function initWallMusic() {
  wallMusicControl?.addEventListener("click", async () => {
    if (state.wallMusicOn && wallMusic?.paused) {
      await attemptWallMusicPlay();
      return;
    }
    if (state.wallMusicOn && wallMusic && !wallMusic.paused) {
      state.wallMusicOn = false;
      wallMusic.pause();
      setWallMusicIcon(false);
      setWallMusicHint(false);
      wallMusicControl?.setAttribute("aria-pressed", "false");
      return;
    }
    state.wallMusicOn = true;
    wallMusicControl?.setAttribute("aria-pressed", "true");
    await attemptWallMusicPlay();
  });

  const unlock = () => {
    if (
      state.screen === "wall" &&
      state.wallMusicOn &&
      wallMusic?.paused &&
      !wallMusicHint?.hidden
    ) {
      attemptWallMusicPlay();
    }
  };
  document.body.addEventListener("pointerdown", unlock, { passive: true });
  document.body.addEventListener("keydown", unlock);
}

function showError(el, message) {
  el.hidden = !message;
  el.textContent = message || "";
}

function friendlyError(err) {
  const code = `${err?.code || ""} ${err?.message || ""}`;
  if (/PERMISSION_DENIED|permission_denied/i.test(code)) return RULES_HINT;
  return "L'envoi a échoué. Réessaie dans un instant.";
}

function readGrant() {
  try {
    const grant = JSON.parse(localStorage.getItem(STORE) || "null");
    if (!grant?.id || grant.createdAt == null) return null;
    const createdAt = createdAtMs(grant.createdAt);
    if (!createdAt || Date.now() > createdAt + GRACE_MS) {
      localStorage.removeItem(STORE);
      return null;
    }
    return { ...grant, createdAt };
  } catch {
    return null;
  }
}

function saveGrant(grant) {
  const createdAt = createdAtMs(grant.createdAt) || Date.now();
  state.grant = { ...grant, createdAt };
  localStorage.setItem(STORE, JSON.stringify(state.grant));
}

function clearGrant() {
  state.grant = null;
  localStorage.removeItem(STORE);
  window.clearInterval(state.timer);
  state.timer = 0;
}

function createdAtMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  return 0;
}

function msLeft() {
  if (!state.grant) return 0;
  const t0 = createdAtMs(state.grant.createdAt);
  if (!t0) return 0;
  return t0 + GRACE_MS - Date.now();
}

function memoryDomId(id) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(id);
  return String(id).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function hashId(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededUnit(seed, slot) {
  const x = Math.sin(seed * 12.9898 + slot * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function sortChronological(items) {
  return [...items].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

function photoPageCount(items) {
  return Math.max(1, Math.ceil((items?.length || 0) / PICTURES_PER_PAGE));
}

function totalPages(items) {
  const fromPhotos = photoPageCount(items);
  const manual = Math.max(1, state.wallMeta?.pageCount || 1);
  const nameKeys = Object.keys(state.wallMeta?.names || {})
    .map((k) => parseInt(k, 10))
    .filter((n) => !Number.isNaN(n));
  const fromNames = nameKeys.length ? Math.max(...nameKeys) + 1 : 1;
  return Math.max(fromPhotos, manual, fromNames);
}

function pageDisplayName(index) {
  const names = state.wallMeta?.names || {};
  return names[index] ?? names[String(index)] ?? `Page ${index + 1}`;
}

function refreshGotoSelect() {
  if (!gotoPageSelect) return;
  const items = state.lastWallItems || [];
  const pages = totalPages(items);
  const current = gotoPageSelect.value;
  gotoPageSelect.replaceChildren();
  for (let i = 0; i < pages; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = pageDisplayName(i);
    if (i === state.currentPage) opt.selected = true;
    gotoPageSelect.append(opt);
  }
  if (current && [...gotoPageSelect.options].some((o) => o.value === current)) {
    gotoPageSelect.value = current;
  }
}

async function saveCurrentPageName() {
  if (!pageTitle) return;
  const name = pageTitle.value.trim().slice(0, 40);
  if (!name) {
    pageTitle.value = pageDisplayName(state.currentPage);
    return;
  }
  const names = { ...(state.wallMeta?.names || {}), [state.currentPage]: name };
  state.wallMeta = { ...state.wallMeta, names };
  try {
    await update(ref(db, "wallMeta/names"), { [state.currentPage]: name });
  } catch {
    /* ignore */
  }
  refreshGotoSelect();
}

async function createNamedPage(prefill) {
  const items = state.lastWallItems || [];
  const newIndex = totalPages(items);
  const defaultName = `Page ${newIndex + 1}`;
  const name =
    typeof prefill === "string" && prefill.trim()
      ? prefill.trim().slice(0, 40)
      : defaultName;
  const nextCount = newIndex + 1;
  try {
    await update(ref(db, "wallMeta"), { pageCount: nextCount });
    await update(ref(db, "wallMeta/names"), { [newIndex]: name });
    state.wallMeta = {
      pageCount: nextCount,
      names: { ...(state.wallMeta?.names || {}), [newIndex]: name },
    };
  } catch {
    return;
  }
  state.wallSig = "";
  goToPage(newIndex, { animate: true });
}

function promptNewPageName() {
  const suggestion = `Page ${totalPages(state.lastWallItems || []) + 1}`;
  const name = window.prompt("Nom de la nouvelle page ?", suggestion);
  if (name === null) return;
  createNamedPage(name || suggestion);
}

function itemsForPage(items, page) {
  const sorted = sortChronological(items);
  const start = page * PICTURES_PER_PAGE;
  return sorted.slice(start, start + PICTURES_PER_PAGE);
}

/** Grows the drop zone as more photos land on the wall. */
function wallCanvasHeight(count) {
  const base = Math.max(480, window.innerHeight * 0.52);
  const perPhoto = count > 14 ? 36 : 64;
  const spread = Math.ceil(Math.sqrt(count + 1)) * 52;
  return Math.max(base, 340 + count * perPhoto + spread);
}

/** Target polaroid width as a fraction of the wall (similar feel on phone vs desktop). */
function defaultLayoutWidthFrac(canvasWidth) {
  const narrow = canvasWidth < 520;
  const targetPx = narrow
    ? canvasWidth * 0.42
    : canvasWidth < 900
      ? canvasWidth * 0.28
      : 210;
  const frac = targetPx / Math.max(1, canvasWidth);
  return Math.min(0.48, Math.max(0.18, frac));
}

function layoutCardWidth(widthFrac, canvasWidth) {
  const raw = widthFrac * canvasWidth;
  const narrow = canvasWidth < 520;
  const min = narrow ? 122 : 156;
  const max = narrow ? canvasWidth * 0.55 : Math.min(300, canvasWidth * 0.36);
  return Math.min(max, Math.max(min, raw));
}

function scatterLayout(memory, pageItems, canvasWidth, canvasHeight) {
  const saved = state.layouts[memory.id];
  if (
    saved &&
    typeof saved.x === "number" &&
    typeof saved.y === "number" &&
    saved.page === state.currentPage
  ) {
    const cardW = layoutCardWidth(saved.w || defaultLayoutWidthFrac(canvasWidth), canvasWidth);
    return {
      left: saved.x * canvasWidth,
      top: saved.y * canvasHeight,
      cardW,
      tilt: saved.tilt ?? memory.tilt ?? 0,
      z: saved.z ?? 2,
    };
  }

  const seed = hashId(memory.id);
  const u1 = seededUnit(seed, 1);
  const u2 = seededUnit(seed, 2);
  const u3 = seededUnit(seed, 3);
  const count = pageItems.length || 1;

  const cardW = layoutCardWidth(defaultLayoutWidthFrac(canvasWidth), canvasWidth);
  const cardH = cardW * (4 / 3);
  const margin = canvasWidth < 520 ? 6 : 12;

  const maxX = Math.max(margin, canvasWidth - cardW - margin);
  const maxY = Math.max(margin, canvasHeight - cardH - margin);
  const left = margin + u1 * maxX;
  const top = margin + u2 * maxY;
  const tilt =
    typeof memory.tilt === "number" && Number.isFinite(memory.tilt)
      ? memory.tilt
      : (u3 - 0.5) * 16;

  return { left, top, cardW, tilt, z: 2 + Math.floor(u2 * 6) };
}

function parseTiltDeg(card) {
  const raw = getComputedStyle(card).getPropertyValue("--tilt").trim();
  return parseFloat(raw) || 0;
}

function bringCardToFront(card) {
  state.editZ = (state.editZ || 24) + 1;
  card.style.zIndex = String(state.editZ);
}

function baseZForMemory(memory, fallback = 2) {
  const saved = state.layouts[memory.id];
  if (saved && Number.isFinite(saved.z)) return saved.z;
  return fallback;
}

function resetCardZIndex(card, memory) {
  if (!card || !memory) return;
  const base = baseZForMemory(
    memory,
    parseInt(card.dataset.baseZ, 10) || 2
  );
  card.style.zIndex = String(base);
  card.dataset.baseZ = String(base);
}

function dismissWallFocus() {
  closeNoteZoom();
  unflipAllExcept();
  state.flippedId = null;
}

function cardCenter(card) {
  const r = card.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function persistCardLayout(card, memory) {
  const canvasW = wallGrid.clientWidth || 1;
  const canvasH = wallGrid.clientHeight || 1;
  const layout = {
    page: state.currentPage,
    x: Math.min(1, Math.max(0, parseFloat(card.style.left) / canvasW)),
    y: Math.min(1, Math.max(0, parseFloat(card.style.top) / canvasH)),
    w: Math.min(0.5, Math.max(0.08, parseFloat(card.style.width) / canvasW)),
    tilt: parseTiltDeg(card),
    z: parseInt(card.style.zIndex, 10) || state.editZ || 2,
  };
  state.layouts[memory.id] = layout;
  state.wallSig = "";
  if (!memory._demo) {
    set(ref(db, `wallLayouts/${memory.id}`), layout).catch(() => {});
  }
}

function attachEditInteractions(card, memory) {
  const resize = document.createElement("button");
  resize.type = "button";
  resize.className = "memory__resize";
  resize.setAttribute("aria-label", "Redimensionner");
  const rotate = document.createElement("button");
  rotate.type = "button";
  rotate.className = "memory__rotate";
  rotate.setAttribute("aria-label", "Tourner");
  card.append(resize, rotate);

  let drag = null;
  let resizeDrag = null;
  let rotateDrag = null;

  const onPointerDown = (e) => {
    if (!state.editMode) return;
    if (e.target === resize || e.target === rotate) return;
    e.preventDefault();
    card.setPointerCapture(e.pointerId);
    bringCardToFront(card);
    state.selectedId = memory.id;
    wallGrid
      .querySelectorAll(".memory")
      .forEach((el) => el.classList.toggle("is-selected", el === card));
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      left: parseFloat(card.style.left),
      top: parseFloat(card.style.top),
    };
    card.classList.add("is-dragging");
  };

  const onPointerMove = (e) => {
    if (rotateDrag && rotateDrag.id === e.pointerId) {
      const c = cardCenter(card);
      const ang = (Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180) / Math.PI;
      const delta = ang - rotateDrag.startAngle;
      const next = Math.max(-45, Math.min(45, rotateDrag.baseTilt + delta));
      card.style.setProperty("--tilt", `${next}deg`);
      return;
    }
    if (resizeDrag && resizeDrag.id === e.pointerId) {
      const dw = e.clientX - resizeDrag.x;
      const next = Math.max(96, resizeDrag.w + dw);
      card.style.width = `${next}px`;
      return;
    }
    if (!drag || drag.id !== e.pointerId) return;
    card.style.left = `${drag.left + e.clientX - drag.x}px`;
    card.style.top = `${drag.top + e.clientY - drag.y}px`;
  };

  const endDrag = (e) => {
    if (drag?.id === e.pointerId) {
      card.releasePointerCapture(e.pointerId);
      card.classList.remove("is-dragging");
      persistCardLayout(card, memory);
      drag = null;
    }
    if (resizeDrag?.id === e.pointerId) {
      resize.releasePointerCapture(e.pointerId);
      persistCardLayout(card, memory);
      resizeDrag = null;
    }
    if (rotateDrag?.id === e.pointerId) {
      rotate.releasePointerCapture(e.pointerId);
      persistCardLayout(card, memory);
      rotateDrag = null;
    }
  };

  resize.addEventListener("pointerdown", (e) => {
    if (!state.editMode) return;
    e.stopPropagation();
    e.preventDefault();
    bringCardToFront(card);
    resize.setPointerCapture(e.pointerId);
    resizeDrag = {
      id: e.pointerId,
      x: e.clientX,
      w: parseFloat(card.style.width),
    };
  });

  rotate.addEventListener("pointerdown", (e) => {
    if (!state.editMode) return;
    e.stopPropagation();
    e.preventDefault();
    bringCardToFront(card);
    const c = cardCenter(card);
    const pointerAngle = (Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180) / Math.PI;
    rotate.setPointerCapture(e.pointerId);
    rotateDrag = {
      id: e.pointerId,
      baseTilt: parseTiltDeg(card),
      startAngle: pointerAngle,
    };
  });

  card.addEventListener("pointerdown", onPointerDown);
  card.addEventListener("pointermove", onPointerMove);
  card.addEventListener("pointerup", endDrag);
  card.addEventListener("pointercancel", endDrag);
  card.addEventListener(
    "wheel",
    (e) => {
      if (!state.editMode) return;
      e.preventDefault();
      bringCardToFront(card);
      const next = parseTiltDeg(card) + (e.deltaY > 0 ? -1.5 : 1.5);
      const clamped = Math.max(-45, Math.min(45, next));
      card.style.setProperty("--tilt", `${clamped}deg`);
      persistCardLayout(card, memory);
    },
    { passive: false }
  );
}

function updatePageIndicator(items) {
  const pages = totalPages(items);
  if (pageTitle) {
    if (document.activeElement !== pageTitle) {
      pageTitle.value = pageDisplayName(state.currentPage);
    }
    pageTitle.readOnly = !state.editMode;
    pageTitle.classList.toggle("is-editable", state.editMode);
  }
  if (pageTitleCount) {
    pageTitleCount.textContent = pages > 1 ? `${state.currentPage + 1} / ${pages}` : "";
  }
  refreshGotoSelect();
}

function goToPage(target, { animate = false } = {}) {
  const items = state.lastWallItems || [];
  const pages = totalPages(items);
  const next = ((target % pages) + pages) % pages;
  if (next === state.currentPage && !animate) return;
  state.currentPage = next;
  localStorage.setItem("wall-page", String(next));
  updatePageIndicator(items);
  if (animate && wallBook) {
    wallBook.classList.add("is-flipping");
    window.setTimeout(() => wallBook.classList.remove("is-flipping"), 900);
  }
  state.wallSig = "";
  renderWall(items);
  prefetchAroundPage(items, state.currentPage);
  closePiuMenu();
}

function pageIndexForMemory(items, id) {
  const sorted = sortChronological(items);
  const idx = sorted.findIndex((m) => m.id === id);
  if (idx < 0) return Math.max(0, photoPageCount(items) - 1);
  return Math.floor(idx / PICTURES_PER_PAGE);
}

function updatePlacementBar() {
  const graceLeft = msLeft();
  const inGrace = graceLeft > 0 && !!state.grant;
  const placing = state.placementMode && inGrace;
  const graceSecs = Math.ceil(graceLeft / 1000);

  if (wallEditBar) {
    wallEditBar.hidden = !(state.editMode || inGrace);
  }
  if (wallEditDone) wallEditDone.hidden = !state.editMode;
  if (wallEditHint) {
    if (placing) {
      wallEditHint.textContent = `Place ta photo où tu veux · ${graceSecs}s pour modifier ou supprimer`;
    } else if (state.editMode) {
      wallEditHint.textContent = inGrace
        ? `Glisse pour ajuster · ${graceSecs}s pour modifier ou supprimer`
        : "Glisse · coin jaune = taille · coin bleu = rotation (molette aussi)";
    } else if (inGrace) {
      wallEditHint.textContent = `Encore ${graceSecs}s pour modifier ou supprimer ta photo`;
    } else {
      wallEditHint.textContent =
        "Glisse · coin jaune = taille · coin bleu = rotation (molette aussi)";
    }
  }
  if (editBtn) editBtn.hidden = !inGrace;
  if (deleteBtn) deleteBtn.hidden = !inGrace;
  if (wallCreatePage) wallCreatePage.hidden = placing || (inGrace && !state.editMode);
  if (wallGraceEdit) {
    wallGraceEdit.hidden = !(inGrace && !state.editMode);
  }
}

function openWallEdit() {
  if (state.editMode) return;
  state.placementMode = false;
  state.placementId = null;
  closePiuMenu();
  updatePlacementBar();
  setEditMode(true);
}

function setEditMode(on) {
  const was = state.editMode;
  state.editMode = on;
  wallGrid?.classList.toggle("is-edit-mode", on);
  if (piuDock) piuDock.classList.toggle("is-dimmed", on);
  updatePlacementBar();
  updatePageIndicator(state.lastWallItems || []);
  if (pageTitle) {
    pageTitle.readOnly = !on;
    pageTitle.classList.toggle("is-editable", on);
  }
  if (!on) {
    saveCurrentPageName();
    if (!state.placementMode) {
      state.selectedId = null;
      state.placementId = null;
    }
    dismissWallFocus();
    wallGrid?.querySelectorAll(".memory.is-selected").forEach((el) =>
      el.classList.remove("is-selected")
    );
    if (was) {
      state.wallSig = "";
      scheduleRenderWall(state.lastWallItems || []);
    }
  } else {
    closePiuMenu();
    dismissWallFocus();
    if (state.selectedId) {
      wallGrid?.querySelectorAll(".memory").forEach((el) => {
        el.classList.toggle("is-selected", el.dataset.id === state.selectedId);
      });
    }
  }
}

function scheduleRenderWall(items) {
  window.clearTimeout(renderWallTimer);
  renderWallTimer = window.setTimeout(() => renderWall(items), 60);
}

function patchMemoryCard(memory) {
  const card = wallGrid?.querySelector(`.memory[data-id="${memoryDomId(memory.id)}"]`);
  if (!card) return false;
  const img = card.querySelector(".memory-photo");
  const note = card.querySelector(".note-text");
  card.querySelectorAll(".caption").forEach((el) => {
    el.textContent = memory.name || "";
  });
  if (note) {
    note.textContent = memory.note || "";
    if (card.querySelector(".memory-inner.is-flipped")) {
      requestAnimationFrame(() => fitNoteElement(note, 15.5, 9.5, true));
    }
  }
  if (img && typeof memory.image === "string" && memory.image.startsWith("data:image/jpeg")) {
    const next = wallPhotoSrc(memory, !img.hasAttribute("data-src"));
    if (img.src !== next) img.src = next;
  }
  const tilt =
    typeof memory.tilt === "number" && Number.isFinite(memory.tilt)
      ? memory.tilt
      : parseTiltDeg(card);
  card.style.setProperty("--tilt", `${tilt}deg`);
  return true;
}

function syncWallItemsWhileEditing(items, prev) {
  const prevIds = new Set(prev.map((m) => m.id));
  const nextIds = new Set(items.map((m) => m.id));
  const pageItems = itemsForPage(items, state.currentPage);
  const onPage = new Set(pageItems.map((m) => m.id));
  const canvasW = wallGrid?.clientWidth || window.innerWidth - 16;
  const canvasH = wallCanvasHeight(pageItems.length || 1);

  for (const id of prevIds) {
    if (!nextIds.has(id)) {
      wallGrid
        ?.querySelector(`.memory[data-id="${memoryDomId(id)}"]`)
        ?.remove();
    }
  }

  for (const memory of items) {
    if (prevIds.has(memory.id)) patchMemoryCard(memory);
  }

  for (const memory of items) {
    if (prevIds.has(memory.id) || !onPage.has(memory.id)) continue;
    const spot = scatterLayout(memory, pageItems, canvasW, canvasH);
    const card = createCard(memory, { scatter: true, ...spot });
    if (state.selectedId === memory.id) card.classList.add("is-selected");
    wallGrid?.append(card);
  }

  const empty = wallGrid?.querySelector(".empty");
  if (pageItems.length && empty) empty.remove();
}

function applyWallItemsFromFirebase(items) {
  const prev = state.lastWallItems || [];
  const prevIds = prev.map((m) => m.id).join(",");
  const nextIds = items.map((m) => m.id).join(",");
  const structureChanged = prevIds !== nextIds || prev.length !== items.length;

  state.lastWallItems = items;

  if (state.placementMode && state.placementId) {
    const page = pageIndexForMemory(items, state.placementId);
    if (page !== state.currentPage) {
      state.currentPage = page;
      localStorage.setItem("wall-page", String(page));
      scheduleRenderWall(items);
      return;
    }
    state.selectedId = state.placementId;
  }

  if (state.editMode) {
    if (structureChanged) syncWallItemsWhileEditing(items, prev);
    else items.forEach((m) => patchMemoryCard(m));
    return;
  }

  if (!structureChanged && wallHasPainted) {
    let patchedAll = true;
    for (const m of items) {
      if (!patchMemoryCard(m)) patchedAll = false;
    }
    if (patchedAll) return;
  }

  scheduleRenderWall(items);
}

function returnAfterMemoryEdit(memory) {
  state.visible = memory;
  const base = state.lastWallItems || [];
  const items = sortChronological([
    ...base.filter((m) => m.id !== memory.id),
    memory,
  ]);
  applyWallItemsFromFirebase(items);
  showScreen("wall");
  state.selectedId = state.placementId || memory.id;
  if (state.placementMode || state.editMode) {
    wallGrid?.querySelectorAll(".memory").forEach((el) => {
      el.classList.toggle("is-selected", el.dataset.id === state.selectedId);
    });
  }
  armTimer();
  updatePlacementBar();
}

function ensureWallBooted() {
  if (wallBooted) return;
  wallBooted = true;
  initWallChrome();
  initWallSwipe();
  initWallMusic();
  watchWall();
  let resizeTimer;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (state.editMode) return;
      state.wallSig = "";
      if (state.lastWallItems) renderWall(state.lastWallItems);
    }, 160);
  });
}

function enterPostUploadWall(memory) {
  saveGrant({
    id: memory.id,
    editKey: memory.editKey,
    createdAt: memory.createdAt,
  });
  state.visible = memory;
  state.editing = null;
  state.deleteArmed = false;
  if (deleteBtn) deleteBtn.textContent = "Supprimer";
  state.placementMode = true;
  state.placementId = memory.id;
  state.selectedId = memory.id;

  try {
    const url = new URL(location.href);
    if (url.searchParams.has("upload")) {
      url.searchParams.delete("upload");
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  } catch {
    /* ignore */
  }

  ensureWallBooted();
  showScreen("wall");

  let items = state.lastWallItems || [];
  if (!items.some((m) => m.id === memory.id)) {
    items = sortChronological([...items, memory]);
  }
  const page = pageIndexForMemory(items, memory.id);
  if (page !== state.currentPage) {
    state.currentPage = page;
    localStorage.setItem("wall-page", String(page));
  }
  state.lastWallItems = items;
  setEditMode(true);
  armTimer();
  updatePlacementBar();
}

function togglePiuMenu(force) {
  const open = typeof force === "boolean" ? force : piuMenu?.hidden;
  if (!piuMenu || !piuFab) return;
  const show = typeof force === "boolean" ? force : piuMenu.hidden;
  piuMenu.hidden = !show;
  piuFab.setAttribute("aria-expanded", show ? "true" : "false");
}

function closePiuMenu() {
  togglePiuMenu(false);
  if (gotoPanel) gotoPanel.hidden = true;
  if (actionGotoToggle) actionGotoToggle.setAttribute("aria-expanded", "false");
}

function setWallLoading(loading) {
  state.wallLoading = loading;
  if (wallLoader) wallLoader.hidden = !loading;
  if (wallGrid) {
    wallGrid.classList.toggle("is-loading", loading);
    if (!loading) wallGrid.style.opacity = "";
  }
}

function mergeWallItems(firebaseItems) {
  const urlDemo = demoCountFromUrl();
  const demoCount = urlDemo || DEMO_POLAROID_COUNT;
  if (!demoCount) return firebaseItems;
  const demos = buildDemoPolaroids(demoCount).filter(
    (demo) => !firebaseItems.some((item) => item.id === demo.id)
  );
  return [...firebaseItems, ...demos].sort(
    (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
  );
}

function scheduleImageLoads(token) {
  const imgs = [...wallGrid.querySelectorAll("img.memory-photo[data-src]")];
  if (!imgs.length) {
    if (token === state.wallLoadToken) setWallLoading(false);
    return;
  }

  let loaded = 0;
  const tryFinish = () => {
    loaded += 1;
    if (loaded >= imgs.length && token === state.wallLoadToken) {
      setWallLoading(false);
    }
  };

  let index = 0;
  const loadBatch = () => {
    if (token !== state.wallLoadToken) return;
    const slice = imgs.slice(index, index + 2);
    index += 2;
    slice.forEach((img) => {
      const src = img.getAttribute("data-src");
      if (!src) {
        tryFinish();
        return;
      }
      img.addEventListener(
        "load",
        () => tryFinish(),
        { once: true }
      );
      img.addEventListener(
        "error",
        () => tryFinish(),
        { once: true }
      );
      img.src = src;
      img.removeAttribute("data-src");
    });
    if (index < imgs.length) {
      requestAnimationFrame(loadBatch);
    }
  };

  requestAnimationFrame(loadBatch);
  window.setTimeout(() => {
    if (token === state.wallLoadToken && state.wallLoading) {
      setWallLoading(false);
    }
  }, 10_000);
}

function fitNoteElement(el, maxPx, minPx, allowScroll = true) {
  if (!el) return;
  el.style.fontSize = `${maxPx}px`;
  el.classList.remove("note-text--scroll");
  let size = maxPx;
  while (size > minPx && el.scrollHeight > el.clientHeight + 2) {
    size -= 0.45;
    el.style.fontSize = `${size}px`;
  }
  if (allowScroll && el.scrollHeight > el.clientHeight + 2) {
    el.style.fontSize = `${minPx}px`;
    el.classList.add("note-text--scroll");
  }
}

function unflipAllExcept(keepInner = null) {
  document.querySelectorAll(".memory-inner.is-flipped").forEach((node) => {
    if (keepInner && node === keepInner) return;
    node.classList.remove("is-flipped");
    const card = node.closest(".memory");
    const id = card?.dataset?.id;
    if (card && id) {
      const memory = state.lastWallItems?.find((m) => m.id === id);
      if (memory) resetCardZIndex(card, memory);
    }
  });
  if (!keepInner) state.flippedId = null;
}

function closeNoteZoom() {
  if (!noteZoom || noteZoom.hidden) return;
  noteZoom.classList.remove("is-open", "is-reading");
  noteZoom.hidden = true;
  state.noteZoomOpen = false;
  document.body.classList.remove("note-zoom-lock");
}

function openNoteZoom(memory, imageSrc) {
  if (!noteZoom || !noteZoomText) return;
  const fullSrc =
    imageSrc ||
    (typeof memory.image === "string" ? memory.image : "");
  if (noteZoomImg && fullSrc) noteZoomImg.src = fullSrc;
  noteZoomText.textContent = memory.note || "";
  if (noteZoomSign) noteZoomSign.textContent = memory.name || "";
  noteZoom.hidden = false;
  state.noteZoomOpen = true;
  document.body.classList.add("note-zoom-lock");
  requestAnimationFrame(() => {
    noteZoom.classList.add("is-open", "is-reading");
    fitNoteElement(noteZoomText, 21, 13, true);
  });
}

function wireCardFlip(button, inner, note, memory, img) {
  note.setAttribute("tabindex", "0");
  note.setAttribute("role", "button");
  note.setAttribute(
    "aria-label",
    "Agrandir le message de " + (memory.name || "")
  );

  note.addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.editMode || !inner.classList.contains("is-flipped")) return;
    const src = img.currentSrc || img.src || memory.image;
    openNoteZoom(memory, src);
  });

  note.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      if (!inner.classList.contains("is-flipped")) return;
      openNoteZoom(memory, img.src || memory.image);
    }
  });

  button.addEventListener("click", (e) => {
    if (state.editMode) {
      e.preventDefault();
      bringCardToFront(button);
      state.selectedId = memory.id;
      wallGrid
        ?.querySelectorAll(".memory")
        .forEach((el) => el.classList.toggle("is-selected", el === button));
      return;
    }
    if (e.target.closest(".note-text")) return;

    const wasFlipped = inner.classList.contains("is-flipped");
    closeNoteZoom();
    unflipAllExcept();

    if (wasFlipped) {
      resetCardZIndex(button, memory);
      return;
    }

    bringCardToFront(button);
    inner.classList.add("is-flipped");
    state.flippedId = memory.id;
    requestAnimationFrame(() => {
      fitNoteElement(note, 15.5, 9.5, true);
    });
  });
}

function setUploadTilt(deg) {
  const v = Math.max(-24, Math.min(24, Number(deg) || 0));
  state.tiltDeg = v;
  if (tiltInput) tiltInput.value = String(v);
  if (tiltOut) tiltOut.textContent = `${v}°`;
  if (tiltFrame) tiltFrame.style.setProperty("--upload-tilt", `${v}deg`);
}

function createCard(memory, layout = {}) {
  const { scatter = false, left, top, cardW, tilt = 0, z = 2 } = layout;
  const button = document.createElement("button");
  button.type = "button";
  button.className = scatter ? "memory memory--scatter" : "memory memory--solo";
  button.dataset.id = memory.id;
  button.style.setProperty("--tilt", `${tilt}deg`);
  button.style.animationDelay = `${Math.min(Math.abs(tilt) * 35, 280)}ms`;
  if (scatter) {
    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
    button.style.width = `${cardW}px`;
    button.style.zIndex = String(z);
    button.dataset.baseZ = String(z);
  }
  button.setAttribute("aria-label", `Message de ${memory.name}. Clique pour le lire.`);

  const inner = document.createElement("span");
  inner.className = "memory-inner";

  const front = document.createElement("span");
  front.className = "face front";
  const wrap = document.createElement("span");
  wrap.className = "photo-wrap";
  const img = document.createElement("img");
  img.alt = "";
  img.decoding = "async";
  img.className = "memory-photo";
  img.loading = "lazy";
  if (typeof memory.image === "string" && memory.image.startsWith("data:image/jpeg")) {
    if (scatter) {
      const warmed = isWallImageWarm(memory.id);
      img.src = wallPhotoSrc(memory, true);
      if (!warmed) img.setAttribute("data-src", memory.image);
      img.addEventListener("load", () => markWallImageWarm(memory.id), { once: true });
    } else {
      img.src = memory.image;
    }
  }
  wrap.append(img);
  const caption = document.createElement("span");
  caption.className = "caption";
  caption.textContent = memory.name;
  front.append(wrap, caption);

  const back = document.createElement("span");
  back.className = "face back";
  const note = document.createElement("span");
  note.className = "note-text";
  note.textContent = memory.note;
  const signature = document.createElement("span");
  signature.className = "caption";
  signature.textContent = memory.name;
  back.append(note, signature);

  inner.append(front, back);
  button.append(inner);
  wireCardFlip(button, inner, note, memory, img);
  if (scatter) attachEditInteractions(button, memory);
  return button;
}

function renderWall(items) {
  state.lastWallItems = items;
  const pages = totalPages(items);
  if (state.currentPage >= pages) state.currentPage = pages - 1;
  const pageItems = itemsForPage(items, state.currentPage);
  const contentSig = pageItems
    .map((item) => `${item.id}:${item.name}:${item.tilt ?? ""}`)
    .join("|");
  const layoutSig = pageItems
    .map((item) => {
      const L = state.layouts[item.id];
      return L ? `${item.id}:${L.x}:${L.y}:${L.tilt}` : item.id;
    })
    .join(",");
  const canvasW = wallGrid.clientWidth || window.innerWidth - 16;
  const sig = `${contentSig}|p${state.currentPage}|w${Math.round(canvasW)}|${layoutSig}|e${state.editMode ? 1 : 0}`;
  if (sig === state.wallSig) return;
  updatePageIndicator(items);
  state.wallSig = sig;

  const flipTarget = state.flippedId;

  wallGrid.classList.toggle("is-repaint", wallHasPainted);
  wallGrid.replaceChildren();
  const canvasH = wallCanvasHeight(pageItems.length || 1);
  wallGrid.style.minHeight = `${canvasH}px`;

  if (!pageItems.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = items.length
      ? "Cette page est vide."
      : "Le mur est encore vide. Les mots arrivent.";
    wallGrid.append(empty);
    setWallLoading(false);
    return;
  }

  pageItems.forEach((memory) => {
    const spot = scatterLayout(memory, pageItems, canvasW, canvasH);
    const card = createCard(memory, { scatter: true, ...spot });
    if (flipTarget === memory.id && !state.editMode) {
      const inner = card.querySelector(".memory-inner");
      inner.classList.add("is-flipped");
      const noteEl = card.querySelector(".note-text");
      requestAnimationFrame(() => fitNoteElement(noteEl, 15.5, 9.5, true));
    }
    if (state.editMode && state.selectedId === memory.id) {
      card.classList.add("is-selected");
    }
    wallGrid.append(card);
  });

  state.wallLoadToken += 1;
  scheduleImageLoads(state.wallLoadToken);
  prefetchWallPage(items, state.currentPage + 1);
  wallHasPainted = true;
}

function watchWall() {
  setWallLoading(true);
  const savedPage = parseInt(localStorage.getItem("wall-page") || "0", 10);
  if (Number.isFinite(savedPage) && savedPage >= 0) {
    state.currentPage = savedPage;
  }

  onValue(
    ref(db, "wallMeta"),
    (snap) => {
      state.wallMeta = snap.val() || { pageCount: 1, names: {} };
      if (state.currentPage >= totalPages(state.lastWallItems || [])) {
        state.currentPage = Math.max(0, totalPages(state.lastWallItems || []) - 1);
      }
      updatePageIndicator(state.lastWallItems || []);
      if (state.editMode) return;
      if (state.lastWallItems) scheduleRenderWall(state.lastWallItems);
    },
    () => {}
  );

  onValue(
    ref(db, "wallLayouts"),
    (snap) => {
      const next = snap.val() || {};
      state.layouts = next;
      if (state.editMode) return;
      state.wallSig = "";
      if (state.lastWallItems) scheduleRenderWall(state.lastWallItems);
    },
    () => {}
  );

  onValue(
    ref(db, "memories"),
    (snap) => {
      const value = snap.val() || {};
      const firebaseItems = Object.entries(value)
        .map(([id, data]) => ({ id, ...data }))
        .filter(
          (item) =>
            !item.removed &&
            typeof item.image === "string" &&
            item.image.startsWith("data:image/jpeg") &&
            typeof item.note === "string" &&
            typeof item.name === "string"
        );
      const items = mergeWallItems(firebaseItems);
      wallStatus.textContent = "";
      wallStatus.hidden = true;
      applyWallItemsFromFirebase(items);
      prefetchAroundPage(items, state.currentPage);
      if (items.length && wallGrid.clientWidth < 48) {
        requestAnimationFrame(() => {
          state.wallSig = "";
          renderWall(items);
        });
      }
      if (!items.length) setWallLoading(false);
    },
    () => {
      setWallLoading(false);
      wallStatus.hidden = false;
      wallStatus.textContent =
        "Le mur ne s'ouvre pas. Vérifie les rules de la Realtime Database.";
    }
  );
}

function initWallSwipe() {
  const SWIPE_MIN_PX = 90;
  const SWIPE_MIN_MS = 260;
  const SWIPE_SLOW_MS = 500;
  const SWIPE_SLOW_PX = 50;

  let track = null;

  const start = (e) => {
    if (state.editMode || state.screen !== "wall") return;
    if (e.target.closest(".piu-dock, .wall-edit-bar, .top a")) return;
    track = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      t0: performance.now(),
    };
  };

  const end = (e) => {
    if (!track || track.id !== e.pointerId) return;
    const dx = e.clientX - track.x0;
    const dy = e.clientY - track.y0;
    const dt = performance.now() - track.t0;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const horizontal = adx > ady * 1.3;
    const longSwipe = dt >= SWIPE_SLOW_MS && adx >= SWIPE_SLOW_PX;
    const committed = dt >= SWIPE_MIN_MS && adx >= SWIPE_MIN_PX;
    const hard = horizontal && (longSwipe || committed);
    if (hard) {
      if (dx < 0) goToPage(state.currentPage + 1, { animate: true });
      else goToPage(state.currentPage - 1, { animate: true });
    }
    track = null;
  };

  wallStage?.addEventListener("pointerdown", start);
  wallStage?.addEventListener("pointerup", end);
  wallStage?.addEventListener("pointercancel", end);
}

function initWallChrome() {
  noteZoomBackdrop?.addEventListener("click", closeNoteZoom);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.noteZoomOpen) closeNoteZoom();
    else if (e.key === "Escape" && state.editMode) setEditMode(false);
  });

  piuFab?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.editMode) return;
    togglePiuMenu();
  });

  document.addEventListener("click", (e) => {
    if (!piuMenu || piuMenu.hidden) return;
    if (piuDock?.contains(e.target)) return;
    closePiuMenu();
  });

  actionTurnPage?.addEventListener("click", () => {
    goToPage(state.currentPage + 1, { animate: true });
  });

  actionGotoToggle?.addEventListener("click", () => {
    const open = gotoPanel?.hidden ?? true;
    if (gotoPanel) gotoPanel.hidden = !open;
    actionGotoToggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) refreshGotoSelect();
  });

  gotoApply?.addEventListener("click", () => {
    const wanted = parseInt(gotoPageSelect?.value ?? "", 10);
    if (!Number.isFinite(wanted)) return;
    goToPage(wanted, { animate: true });
  });

  actionCreatePage?.addEventListener("click", () => {
    closePiuMenu();
    promptNewPageName();
  });

  wallCreatePage?.addEventListener("click", promptNewPageName);

  pageTitle?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      pageTitle.blur();
    }
  });
  pageTitle?.addEventListener("blur", () => {
    if (state.editMode) saveCurrentPageName();
  });

  actionWallEdit?.addEventListener("click", () => openWallEdit());

  wallGraceEdit?.addEventListener("click", () => openWallEdit());

  wallEditDone?.addEventListener("click", () => {
    if (state.placementMode && msLeft() > 0) {
      state.placementMode = false;
      state.placementId = null;
      updatePlacementBar();
    }
    setEditMode(false);
  });

  wallGrid?.addEventListener("pointerdown", (e) => {
    if (state.editMode) return;
    if (e.target.closest(".memory")) return;
    if (e.target.closest(".wall-edit-bar, .piu-dock, .top, .wall-music-wrap"))
      return;
    dismissWallFocus();
  });
}

function resetComposer() {
  state.image = "";
  state.editing = null;
  state.deleteArmed = false;
  fileInput.value = "";
  preview.removeAttribute("src");
  tiltFrame.hidden = true;
  dropLabel.hidden = false;
  composer.classList.remove("has-note");
  if (tiltField) tiltField.hidden = true;
  setUploadTilt(0);
  nameInput.value = "";
  noteInput.value = "";
  count.textContent = "0 caractères";
  sendBtn.textContent = "Envoyer sur le mur";
  cancelEdit.hidden = true;
  showError(formError, "");
  showError(dropError, "");
}

function openComposer(memory) {
  showScreen("upload");
  if (!memory) {
    resetComposer();
    return;
  }
  state.editing = memory;
  state.image = memory.image;
  preview.src = memory.image;
  tiltFrame.hidden = false;
  dropLabel.hidden = true;
  composer.classList.add("has-note");
  if (tiltField) tiltField.hidden = false;
  setUploadTilt(memory.tilt ?? 0);
  nameInput.value = memory.name;
  noteInput.value = memory.note;
  count.textContent = `${memory.note.length} caractères`;
  sendBtn.textContent = "Enregistrer";
  cancelEdit.hidden = false;
  showError(formError, "");
  showError(dropError, "");
}

function renderGrace(memory) {
  const tilt = typeof memory.tilt === "number" ? memory.tilt : 0;
  graceStage.replaceChildren(createCard(memory, { tilt }));
  const left = msLeft();
  const locked = left <= 0;
  graceActions.hidden = locked;
  timer.hidden = locked;
  if (locked) {
    graceKicker.textContent = "C'est figé";
    graceTitle.textContent = "Sur le mur";
    graceLede.textContent =
      "Les 30 secondes sont passées. Tu peux encore la regarder, plus la changer.";
    return;
  }
  graceKicker.textContent = "C'est envoyé";
  graceTitle.textContent = "Regarde";
  graceLede.textContent = `Il te reste ${Math.ceil(left / 1000)}s pour la regarder, la modifier ou la supprimer.`;
  timerBar.style.transform = `scaleX(${left / GRACE_MS})`;
}

function lockGrace() {
  window.clearInterval(state.timer);
  state.timer = 0;
  state.grant = null;
  state.editing = null;
  state.placementMode = false;
  state.placementId = null;
  localStorage.removeItem(STORE);
  graceActions.hidden = true;
  timer.hidden = true;
  if (state.editMode) setEditMode(false);
  else updatePlacementBar();
}

function tick() {
  if (!state.grant) return;
  const left = msLeft();
  if (left <= 0) {
    lockGrace();
    return;
  }
  if (state.screen === "wall" && (state.placementMode || state.editMode || msLeft() > 0)) {
    updatePlacementBar();
  }
}

function armTimer() {
  window.clearInterval(state.timer);
  state.timer = window.setInterval(tick, 200);
}

async function showGrace(memory) {
  enterPostUploadWall(memory);
}

async function compressImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Il me faut une photo.");
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Cette photo ne passe pas. Essaie un JPEG.");
  }
  const maxEdge = 760;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let quality = 0.68;
  let data = canvas.toDataURL("image/jpeg", quality);
  while (data.length > MAX_IMAGE_CHARS && quality > 0.42) {
    quality -= 0.08;
    data = canvas.toDataURL("image/jpeg", quality);
  }
  if (data.length > MAX_IMAGE_CHARS + 20_000) {
    throw new Error("Elle est encore trop lourde. Choisis une autre photo.");
  }
  return data;
}

async function useFile(file) {
  showError(dropError, "");
  try {
    const image = await compressImage(file);
    state.image = image;
    preview.src = image;
    tiltFrame.hidden = false;
    dropLabel.hidden = true;
    composer.classList.add("has-note");
    if (tiltField) tiltField.hidden = false;
    setUploadTilt(state.tiltDeg || 0);
    nameInput.focus();
  } catch (err) {
    showError(dropError, err.message || "Cette photo ne passe pas.");
  }
}

function formValues() {
  const name = nameInput.value.trim();
  const note = noteInput.value.trim();
  if (!state.image) return { error: "Choisis une photo d'abord." };
  if (!name || name.length > MAX_NAME) return { error: "Mets ton prénom." };
  if (!note) return { error: "Écris un petit mot." };
  if (note.length > MAX_NOTE) return { error: "Le message est vraiment trop long." };
  return { name, note, tilt: state.tiltDeg };
}

async function submitMemory() {
  if (state.saving) return;
  const values = formValues();
  if (values.error) {
    showError(formError, values.error);
    return;
  }
  if (state.editing && msLeft() <= 0) {
    showError(formError, "Les 30 secondes sont passées.");
    return;
  }

  state.saving = true;
  sendBtn.disabled = true;
  showError(formError, "");
  const previous = sendBtn.textContent;
  sendBtn.textContent = "Envoi…";

  try {
    if (state.editing) {
      const { id, editKey, createdAt } = state.grant;
      await update(ref(db, `memories/${id}`), {
        name: values.name,
        note: values.note,
        image: state.image,
        tilt: values.tilt,
        createdAt,
        editKey,
        removed: false,
      });
      returnAfterMemoryEdit({
        id,
        editKey,
        createdAt,
        name: values.name,
        note: values.note,
        image: state.image,
        tilt: values.tilt,
      });
    } else {
      const memoryRef = push(ref(db, "memories"));
      const editKey = crypto.randomUUID();
      await set(memoryRef, {
        name: values.name,
        note: values.note,
        image: state.image,
        tilt: values.tilt,
        createdAt: serverTimestamp(),
        editKey,
        removed: false,
      });
      const snap = await get(memoryRef);
      const saved = snap.val();
      await showGrace({ id: memoryRef.key, ...saved });
    }
  } catch (err) {
    showError(formError, friendlyError(err));
    sendBtn.textContent = previous;
  } finally {
    state.saving = false;
    sendBtn.disabled = false;
  }
}

async function deleteMemory() {
  if (!state.grant || msLeft() <= 0) return;
  if (!state.deleteArmed) {
    state.deleteArmed = true;
    deleteBtn.textContent = "Sûr ? Clique encore";
    window.setTimeout(() => {
      state.deleteArmed = false;
      deleteBtn.textContent = "Supprimer";
    }, 3000);
    return;
  }

  deleteBtn.disabled = true;
  try {
    await update(ref(db, `memories/${state.grant.id}`), {
      image: "",
      removed: true,
    });
    clearGrant();
    state.visible = null;
    state.placementMode = false;
    state.placementId = null;
    if (state.editMode) setEditMode(false);
    showScreen("wall");
  } catch (err) {
    showError(formError, friendlyError(err));
    graceLede.textContent = friendlyError(err);
  } finally {
    deleteBtn.disabled = false;
  }
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) useFile(file);
});

["dragenter", "dragover"].forEach((type) => {
  drop.addEventListener(type, (event) => {
    event.preventDefault();
    drop.classList.add("hot");
  });
});

["dragleave", "drop"].forEach((type) => {
  drop.addEventListener(type, (event) => {
    event.preventDefault();
    drop.classList.remove("hot");
  });
});

drop.addEventListener("drop", (event) => {
  const file = event.dataTransfer?.files?.[0];
  if (file) useFile(file);
});

noteInput.addEventListener("input", () => {
  count.textContent = `${noteInput.value.length} caractères`;
});

tiltInput?.addEventListener("input", () => {
  setUploadTilt(tiltInput.value);
});

sendBtn.addEventListener("click", submitMemory);
cancelEdit.addEventListener("click", () => {
  if (state.visible) enterPostUploadWall(state.visible);
  else if (state.grant?.id && state.lastWallItems) {
    const memory = state.lastWallItems.find((m) => m.id === state.grant.id);
    if (memory) enterPostUploadWall(memory);
  }
});
editBtn.addEventListener("click", () => {
  if (state.visible && msLeft() > 0) openComposer(state.visible);
});
deleteBtn.addEventListener("click", deleteMemory);

addLink.hidden = !UPLOADS_ENABLED;

if (uploadRoute && !UPLOADS_ENABLED) {
  showScreen("closed");
} else if (uploadRoute) {
  const grant = readGrant();
  if (!grant) {
    ensureWallBooted();
    openComposer(null);
  } else {
    state.grant = grant;
    ensureWallBooted();
    get(ref(db, `memories/${grant.id}`))
      .then((snap) => {
        const data = snap.val();
        if (!data || data.removed || data.editKey !== grant.editKey) {
          clearGrant();
          openComposer(null);
          return;
        }
        enterPostUploadWall({ id: grant.id, ...data });
      })
      .catch(() => {
        openComposer(null);
      });
  }
} else {
  showScreen("wall");
  ensureWallBooted();
  const storedGrant = readGrant();
  if (storedGrant) {
    state.grant = storedGrant;
    if (msLeft() <= 0) lockGrace();
    else armTimer();
  } else {
    state.grant = null;
    state.placementMode = false;
    state.placementId = null;
  }
  import("./wall-prefetch.js")
    .then((m) => m.warmFirstWallPage())
    .catch(() => {});
}
