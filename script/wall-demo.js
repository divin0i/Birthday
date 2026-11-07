const PALETTE = [
  ["#ff4da6", "#ffd54f"],
  ["#00e5ff", "#ff4da6"],
  ["#ffd54f", "#00e5ff"],
  ["#c77dff", "#ff9ecd"],
  ["#ff6b6b", "#ffd93d"],
  ["#4ecdc4", "#ffe66d"],
  ["#f38181", "#fce38a"],
  ["#aa96da", "#fcbad3"],
];

const NAMES = [
  "Léna",
  "Patrick",
  "Maman",
  "Papa",
  "Chris",
  "Sarah",
  "Yann",
  "Nina",
  "Jo",
  "Alex",
  "Mimi",
  "Tom",
  "Zoé",
  "Ben",
  "Eva",
  "Noah",
  "Lola",
  "Max",
];

const NOTES = [
  "Joyeux anniversaire ma belle ✨",
  "Tu mérites tout l'amour du monde.",
  "Souvenir de l'été — on recommence?",
  "La meilleure cousine, point final.",
  "PS: le gâteau était pour moi.",
  "Tellement fière de toi.",
  "22 ans et déjà une légende.",
  "On t'aime plus que les mots.",
  "Another year of slay 💅",
  "Garde ce sourire toujours.",
];

function demoImage(index) {
  const [a, b] = PALETTE[index % PALETTE.length];
  const canvas = document.createElement("canvas");
  canvas.width = 420;
  canvas.height = 560;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.font = "bold 42px Georgia, serif";
  ctx.fillText("Scovy", 36, 120);
  ctx.font = "22px Poppins, sans-serif";
  ctx.fillText(`#${index + 1}`, 36, 168);
  return canvas.toDataURL("image/jpeg", 0.62);
}

let cached = null;

export function buildDemoPolaroids(count) {
  if (!count) return [];
  if (!cached) {
    cached = Array.from({ length: 20 }, (_, i) => ({
      id: `demo-polaroid-${i}`,
      name: NAMES[i % NAMES.length],
      note: NOTES[i % NOTES.length],
      image: demoImage(i),
      createdAt: Date.now() - (i + 1) * 60_000,
      tilt: (i % 9 - 4) * 3.5,
      _demo: true,
    }));
  }
  return cached.slice(0, Math.min(count, cached.length));
}

export function demoCountFromUrl() {
  const params = new URLSearchParams(location.search);
  if (!params.has("demo")) return 0;
  const n = parseInt(params.get("demo") || "14", 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(20, n)) : 14;
}
