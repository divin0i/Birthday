import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";
import { DEMO_POLAROID_COUNT, PICTURES_PER_PAGE } from "./wall-config.js";
import { buildDemoPolaroids, demoCountFromUrl } from "./wall-demo.js";

const firebaseConfig = {
  apiKey: "AIzaSyC6vxDt94oIq9xCUC84XLZReB1YL1K5rqk",
  authDomain: "pack-a0054.firebaseapp.com",
  databaseURL: "https://pack-a0054-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "pack-a0054",
  storageBucket: "pack-a0054.firebasestorage.app",
  messagingSenderId: "211388684424",
  appId: "1:211388684424:web:3afd7319bc586b2ef2673d",
};

const warmedIds = new Set();
const prefetchedPages = new Set();
let cachedItems = null;
let warmPromise = null;

const PLACEHOLDER =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcA//Z";

function fbApp() {
  if (getApps().length) return getApp();
  return initializeApp(firebaseConfig);
}

function sortChronological(items) {
  return [...items].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export function itemsForPageIndex(items, page) {
  const sorted = sortChronological(items);
  const start = page * PICTURES_PER_PAGE;
  return sorted.slice(start, start + PICTURES_PER_PAGE);
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

function scheduleDecode(pageItems) {
  let i = 0;
  const step = () => {
    const chunk = pageItems.slice(i, i + 2);
    i += 2;
    chunk.forEach((item) => {
      if (!item.image?.startsWith("data:image/jpeg") || warmedIds.has(item.id)) return;
      warmedIds.add(item.id);
      const img = new Image();
      img.decoding = "async";
      img.src = item.image;
    });
    if (i < pageItems.length) {
      const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 16));
      idle(step);
    }
  };
  step();
}

/** Prefetch decode for one wall page (0-based). */
export function prefetchWallPage(items, pageIndex) {
  if (!items?.length || pageIndex < 0) return;
  const pages = Math.max(1, Math.ceil(items.length / PICTURES_PER_PAGE));
  if (pageIndex >= pages) return;
  const key = `p${pageIndex}`;
  if (prefetchedPages.has(key)) return;
  prefetchedPages.add(key);
  scheduleDecode(itemsForPageIndex(items, pageIndex));
}

/** When viewing page X, warm X and X+1 in the background. */
export function prefetchAroundPage(items, currentPage) {
  prefetchWallPage(items, currentPage);
  prefetchWallPage(items, currentPage + 1);
  if (currentPage > 0) prefetchWallPage(items, currentPage - 1);
}

export function isWallImageWarm(id) {
  return warmedIds.has(id);
}

export function markWallImageWarm(id) {
  if (id) warmedIds.add(id);
}

export function wallPhotoSrc(memory, scatter) {
  if (!scatter) return memory.image;
  if (isWallImageWarm(memory.id)) return memory.image;
  return PLACEHOLDER;
}

/** Called from the birthday animation while Scovy watches the timeline. */
export function warmFirstWallPage() {
  if (warmPromise) return warmPromise;
  warmPromise = (async () => {
    try {
      const snap = await get(ref(getDatabase(fbApp()), "memories"));
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
      cachedItems = mergeWallItems(firebaseItems);
      prefetchWallPage(cachedItems, 0);
      prefetchWallPage(cachedItems, 1);
      return cachedItems;
    } catch {
      cachedItems = mergeWallItems([]);
      prefetchWallPage(cachedItems, 0);
      return cachedItems;
    }
  })();
  return warmPromise;
}

export function getCachedWallItems() {
  return cachedItems;
}
