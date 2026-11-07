/** Scovy — change year here if needed; age updates everywhere. */
export const SCOVY_BIRTH_YEAR = 2003;
/** 1–12. Optional: if today is before this date, age counts as not yet reached. */
export const SCOVY_BIRTH_MONTH = 11;
export const SCOVY_BIRTH_DAY = 8;

export function getScovyAge(now = new Date()) {
  let age = now.getFullYear() - SCOVY_BIRTH_YEAR;
  const m = now.getMonth() + 1;
  const d = now.getDate();
  if (
    m < SCOVY_BIRTH_MONTH ||
    (m === SCOVY_BIRTH_MONTH && d < SCOVY_BIRTH_DAY)
  ) {
    age -= 1;
  }
  return age;
}

function ordinalEn(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  const map = { 1: "st", 2: "nd", 3: "rd" };
  return `${n}${map[n % 10] || "th"}`;
}

export function applyScovyAge(root = document) {
  const age = getScovyAge();
  const digits = String(age).padStart(2, "0").split("");

  root.querySelectorAll("[data-scovy-age]").forEach((el) => {
    el.textContent = String(age);
  });
  root.querySelectorAll("[data-scovy-age-ordinal]").forEach((el) => {
    el.textContent = ordinalEn(age);
  });

  const idea6 = root.querySelectorAll(".idea-6 span");
  if (idea6.length >= 2) {
    idea6[0].textContent = digits[0];
    idea6[1].textContent = digits[1];
  }

  const chat = root.querySelector(".hbd-chatbox");
  if (chat && !chat.dataset.ageSynced) {
    chat.dataset.ageSynced = "1";
    chat.innerHTML = chat.innerHTML.replace(/\b22 ans\b/g, `${age} ans`);
  }

  if (root === document && document.title.includes("Scovy")) {
    document.title = document.title.replace(/\b\d{1,2}\b(?=\D*(Birthday|🎂))/, String(age));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => applyScovyAge());
} else {
  applyScovyAge();
}
