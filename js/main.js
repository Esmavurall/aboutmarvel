import { FILMS } from "./data.js";

let fx = null;
import("./scene3d.js")
  .then((m) => {
    fx = m;
    if (fx.preload) {
      fx.preload(FILMS.map((f) => f.hoverImg || f.img));
    }
  })
  .catch((e) => console.warn("3B efekt yüklenemedi, CSS hover kullanılacak.", e));

const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const search = document.getElementById("search");
const filtersEl = document.getElementById("filters");
console.log("Katalog.js: %c%s", "color: #f00; font-weight: bold;", "MCU katalogu yüklendi.");

let activeFilter = "Tümü";
let query = "";

const phases = ["Tümü", ...Array.from(new Set(FILMS.map((f) => f.phase)))];
phases.forEach((p) => {
  const b = document.createElement("button");
  b.className = "chip" + (p === activeFilter ? " active" : "");
  b.textContent = p;
  b.addEventListener("click", () => {
    activeFilter = p;
    document.querySelectorAll("#filters .chip").forEach((c) =>
      c.classList.toggle("active", c.textContent === p)
    );
    render();
  });
  filtersEl.appendChild(b);
});

search.addEventListener("input", (e) => {
  query = e.target.value.trim().toLowerCase();
  render();
});

function matches(f) {
  if (activeFilter !== "Tümü" && f.phase !== activeFilter) return false;
  if (!query) return true;
  const hay = [f.title, f.director, f.producer, f.phase, ...f.cast]
    .join(" ")
    .toLowerCase();
  return hay.includes(query);
}

function cardHTML(f) {
  const castChips = f.cast
    .map((c) => `<span class="cast-chip">${c}</span>`)
    .join("");

  return `
    <article class="film-card" data-id="${f.id}" style="--glow:${hexGlow(f.colorA)}">
      <img class="film-cover" src="${f.img}" alt="${f.title} — vurucu sahne" loading="lazy" />
      <div class="film-fallback" style="background:linear-gradient(135deg, ${f.colorA}, ${f.colorB})">
        <span>${f.title}</span>
      </div>
      <div class="film-scrim"></div>

      <div class="film-badges">
        <span class="rounded-full bg-marvel px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-wider">${f.phase}</span>
        <span class="rounded-full bg-black/40 px-2.5 py-1 text-[0.62rem] font-medium text-zinc-200 backdrop-blur">${f.year}</span>
      </div>

      <div class="film-content">
        <h2 class="film-title">${f.title}</h2>
        <div class="film-scene">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 11-13h-7z"/></svg>
          <span>${f.scene}</span>
        </div>

        <div class="film-detail">
          <div class="film-detail-inner">
            <p class="mb-2 text-[0.68rem] uppercase tracking-wider text-zinc-400">
              ${f.producer} · Yön: ${f.director}
            </p>
            <p class="film-summary">${f.summary}</p>
            <div class="mt-3 flex flex-wrap gap-1.5">${castChips}</div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function hexGlow(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.55)`;
}

function render() {
  const list = FILMS.filter(matches);
  grid.innerHTML = list.map(cardHTML).join("");
  empty.classList.toggle("hidden", list.length > 0);

  list.forEach((f, i) => {
    const card = grid.querySelector(`[data-id="${f.id}"]`);
    card.style.animationDelay = `${i * 0.05}s`;

    const img = card.querySelector(".film-cover");
    img.addEventListener("error", () => (img.style.display = "none"));

    card.addEventListener("pointerenter", () => fx && fx.activate(card, f));
    card.addEventListener("pointerleave", () => fx && fx.deactivate(card));
    card.addEventListener("pointercancel", () => fx && fx.deactivate(card));
    card.addEventListener("pointermove", (e) => {
      if (!fx) return;
      const r = card.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      fx.setPointer(nx, ny);
    });
  });
}

render();
