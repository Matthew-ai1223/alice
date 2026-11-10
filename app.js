// =============================================
//  Dictionary of Yorùbá Medicinal — Application JS
// =============================================

// ---------- Splash Screen ----------
(function initSplash() {
  document.body.classList.add("splash-active");

  // Total splash duration: 5 seconds (1.5s delay + 3.5s loader fill)
  const SPLASH_DURATION = 5200;

  setTimeout(() => {
    const splash = document.getElementById("splash-screen");
    if (splash) {
      splash.classList.add("fade-out");
      document.body.classList.remove("splash-active");

      // Remove from DOM after CSS transition finishes
      splash.addEventListener("transitionend", () => {
        splash.remove();
      }, { once: true });
    }
  }, SPLASH_DURATION);
})();

// ---------- Yorùbá Medicinal Data ----------
// Data is fetched from backend API — no hardcoded entries
let FOODS = [];

// ---------- Alphabet List ----------
let ALPHABET = ["All"];

// ---------- State ----------
let currentLetter = "All";
let audioToggle = false;
let pictureToggle = false;
let visibleCount = 9;
let isLoadingData = true; // True until first backend fetch completes

// ---------- DOM References ----------
const entriesContainer = document.getElementById("entries-container");
const alphabetSidebar = document.getElementById("alphabet-sidebar");
const searchInput = document.getElementById("search-input");
const showMoreBtn = document.getElementById("show-more-btn");

// ---------- Render Alphabet ----------
function renderAlphabet() {
  alphabetSidebar.innerHTML = "";
  ALPHABET.forEach(letter => {
    const btn = document.createElement("button");
    btn.textContent = letter;
    btn.className = letter === currentLetter ? "active" : "";
    btn.addEventListener("click", () => {
      currentLetter = letter;
      visibleCount = 9;
      renderAlphabet();
      renderEntries();
    });
    alphabetSidebar.appendChild(btn);
  });
}

// ---------- Generate Waveform Bars ----------
function renderExtraFields(fields) {
  if (!Array.isArray(fields) || fields.length === 0) return '';
  return `
    <dl class="extra-fields">
      ${fields.map((field) => `
        <div class="extra-field">
          <dt>${field.label}</dt>
          <dd>${field.value}</dd>
        </div>
      `).join('')}
    </dl>
  `;
}

function generateWaveformBars() {
  const heights = [8, 12, 6, 14, 9, 11, 7, 13, 8, 10, 6, 12, 9, 14, 7, 11];
  return heights.map(h => `<div class="bar" style="height:${h}px"></div>`).join("");
}

// ---------- Render Food Card ----------
function renderCard(food) {
  const imageHtml = food.image
    ? `<img src="${food.image}" alt="${food.name} illustration" loading="lazy">`
    : `<div class="no-image-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span>No picture yet</span>
      </div>`;

  return `
    <article class="food-card" id="card-${food.id}">
      <div class="food-card-image">
        ${imageHtml}
      </div>
      <div class="food-card-body">
        <h3>${food.name} <span class="pos">${food.pos}</span></h3>
        <div class="audio-row">
          <button class="play-btn" aria-label="Play pronunciation of ${food.name}" onclick="playAudio('${food.id}')">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </button>
          <div class="waveform-mini">${generateWaveformBars()}</div>
          <span class="ipa-text">[${food.ipa}]</span>
        </div>
        <p class="definition">${food.definition}</p>
        ${renderExtraFields(food.extraFields)}
        ${food.exampleYoruba || food.exampleEnglish ? `
        <div class="example-sentence">
          ${food.exampleYoruba ? `<div class="yoruba">${food.exampleYoruba}</div>` : ''}
          ${food.exampleEnglish ? `<div class="english">${food.exampleEnglish}</div>` : ''}
        </div>` : ''}
      </div>
    </article>
  `;
}

// ---------- Filter Foods ----------
function getFilteredFoods() {
  let filtered = [...FOODS];

  // Letter filter
  if (currentLetter !== "All") {
    filtered = filtered.filter(f => f.letter === currentLetter);
  }

  // Toggle filters
  if (audioToggle) {
    filtered = filtered.filter(f => f.hasAudio);
  }
  if (pictureToggle) {
    filtered = filtered.filter(f => f.hasPicture);
  }

  // Search
  const query = searchInput.value.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(f =>
      f.name.toLowerCase().includes(query) ||
      f.definition.toLowerCase().includes(query) ||
      f.ipa.toLowerCase().includes(query) ||
      f.exampleYoruba.toLowerCase().includes(query) ||
      f.exampleEnglish.toLowerCase().includes(query) ||
      (f.extraFields || []).some((field) =>
        `${field.label} ${field.value}`.toLowerCase().includes(query)
      )
    );
  }

  return filtered;
}

// ---------- Render Entries ----------
function renderEntries() {
  const filtered = getFilteredFoods();
  const toShow = filtered.slice(0, visibleCount);

  // Group by letter
  const grouped = {};
  toShow.forEach(food => {
    if (!grouped[food.letter]) grouped[food.letter] = [];
    grouped[food.letter].push(food);
  });

  let html = "";
  const sortedLetters = Object.keys(grouped).sort();

  sortedLetters.forEach(letter => {
    const items = grouped[letter];
    html += `
      <div class="letter-group" id="letter-${letter}">
        <div class="letter-header">
          <h2>${letter}</h2>
          <span class="entry-count">${items.length} of ${filtered.filter(f => f.letter === letter).length} entries</span>
        </div>
        <div class="entries-grid">
          ${items.map(renderCard).join("")}
        </div>
      </div>
    `;
  });

  if (!html) {
    if (isLoadingData) {
      html = `
        <div style="text-align: center; padding: 64px 24px; color: var(--gray-400);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px; animation: spin 1.2s linear infinite;">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
          <p style="font-size: 1.1rem; font-weight: 600;">Loading entries…</p>
        </div>
      `;
    } else if (FOODS.length === 0) {
      html = `
        <div style="text-align: center; padding: 64px 24px; color: var(--gray-400);">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 16px;">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <p style="font-size: 1.1rem; font-weight: 600;">No entries available yet</p>
          <p style="font-size: 0.9rem; margin-top: 4px;">Please check back soon.</p>
        </div>
      `;
    } else {
      html = `
        <div style="text-align: center; padding: 64px 24px; color: var(--gray-400);">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 16px;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p style="font-size: 1.1rem; font-weight: 600;">No entries found</p>
          <p style="font-size: 0.9rem; margin-top: 4px;">Try changing your filters or search terms.</p>
        </div>
      `;
    }
  }

  entriesContainer.innerHTML = html;

  // Show/hide "Show More" button
  showMoreBtn.style.display = filtered.length > visibleCount ? "inline-block" : "none";

  // Update stats dynamically
  document.getElementById("stat-entries").textContent = filtered.length;

  // Update audio and letters stats from full FOODS dataset
  const audioEl = document.getElementById("stat-audio");
  const lettersEl = document.getElementById("stat-letters");
  if (audioEl) audioEl.textContent = FOODS.filter(f => f.hasAudio).length;
  if (lettersEl) lettersEl.textContent = new Set(FOODS.map(f => f.letter)).size;
}

// ---------- Event Listeners ----------

// Toggle switches
document.getElementById("toggle-audio").addEventListener("click", function () {
  this.classList.toggle("active");
  audioToggle = this.classList.contains("active");
  this.setAttribute("aria-checked", audioToggle);
  visibleCount = 9;
  renderEntries();
});

document.getElementById("toggle-picture").addEventListener("click", function () {
  this.classList.toggle("active");
  pictureToggle = this.classList.contains("active");
  this.setAttribute("aria-checked", pictureToggle);
  visibleCount = 9;
  renderEntries();
});

// Search
let searchTimeout;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    visibleCount = 50;
    renderEntries();
  }, 300);
});

document.getElementById("search-btn").addEventListener("click", () => {
  visibleCount = 50;
  renderEntries();
});

// Show more
showMoreBtn.addEventListener("click", () => {
  visibleCount += 9;
  renderEntries();
  // Smooth scroll to newly revealed cards
  setTimeout(() => {
    const cards = entriesContainer.querySelectorAll(".food-card");
    if (cards.length > 0) {
      cards[cards.length - 1].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 100);
});

// Mobile nav toggle
document.getElementById("nav-toggle").addEventListener("click", () => {
  document.getElementById("nav-links").classList.toggle("open");
});

// ---------- Audio Playback ----------
let currentPlayingAudio = null;

function playAudio(id) {
  const card = document.getElementById(`card-${id}`);
  const btn = card ? card.querySelector(".play-btn") : null;
  const bars = card ? card.querySelectorAll(".waveform-mini .bar") : null;

  // Check if an actual audio URL is available
  const item = FOODS.find(f => f.id === id);
  let duration = 2000;

  if (item && item.audioUrl) {
    if (currentPlayingAudio) {
      currentPlayingAudio.pause();
    }
    const audio = new Audio(item.audioUrl);
    currentPlayingAudio = audio;
    audio.play().catch(() => {});

    audio.onended = () => resetAudioUI(btn, bars);
    audio.onerror = () => resetAudioUI(btn, bars);
  } else {
    setTimeout(() => resetAudioUI(btn, bars), duration);
  }

  if (btn) {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    btn.style.background = "var(--gold-500)";
  }

  if (bars) {
    bars.forEach(bar => {
      bar.style.background = "var(--gold-500)";
      bar.style.animation = "wave 0.6s ease-in-out infinite";
    });
  }
}

function resetAudioUI(btn, bars) {
  if (btn) {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    btn.style.background = "";
  }
  if (bars) {
    bars.forEach(bar => {
      bar.style.background = "";
      bar.style.animation = "";
    });
  }
}

// Expose playAudio globally for inline onclick
window.playAudio = playAudio;

// ---------- Intersection Observer for scroll animations ----------
function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".fade-in").forEach(el => observer.observe(el));
}

// ---------- Backend Integration ----------
const BACKEND_BASE = (() => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  if (!window.location.protocol.startsWith('http')) return 'http://localhost:5000';
  if (window.location.hostname === 'localhost' && window.location.port && window.location.port !== '5000') {
    return 'http://localhost:5000';
  }
  return '';
})();

function resolveMediaUrl(url) {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${BACKEND_BASE}${url}`;
}

async function fetchMedicinalsFromBackend() {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/medicinals`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      FOODS = json.data.map(item => ({
        id: item.id || item._id,
        name: item.name,
        ipa: item.ipa || '',
        pos: item.pos || 'n.',
        definition: item.definition,
        exampleYoruba: item.exampleYoruba || '',
        exampleEnglish: item.exampleEnglish || '',
        extraFields: Array.isArray(item.extraFields) ? item.extraFields : [],
        image: resolveMediaUrl(item.imageUrl),
        audioUrl: resolveMediaUrl(item.audioUrl),
        hasAudio: item.hasAudio,
        hasPicture: item.hasPicture,
        letter: item.letter || 'A'
      }));

      // Dynamically rebuild alphabet tabs from actual data
      const uniqueLetters = Array.from(new Set(FOODS.map(f => f.letter))).sort();
      ALPHABET.length = 1; // keep "All"
      if (uniqueLetters.length > 0) {
        ALPHABET.push(...uniqueLetters);
      }
    }
  } catch (err) {
    /* Keep dictionary usable even if the API is unreachable. */
  } finally {
    // Mark loading complete regardless of success/failure
    isLoadingData = false;
    renderAlphabet();
    renderEntries();
  }
}

// ---------- Initialize ----------
function init() {
  // Show loading state immediately, then fetch real data from backend
  renderAlphabet();
  renderEntries();
  setupScrollAnimations();
  initPWA();
  fetchMedicinalsFromBackend();
}

// ---------- PWA & Zero-Caching Management ----------
function initPWA() {
  // 1. Proactively purge all existing browser caches on load
  if ('caches' in window) {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((name) => {
        caches.delete(name);
      });
    });
  }

  // 2. Register Service Worker with immediate update check
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' })
        .then((reg) => {
          reg.update();
        })
        .catch(() => {});
    });
  }

  // 3. Handle PWA Install Prompt
  let deferredPrompt = null;
  const installBtn = document.getElementById('pwa-install-btn');

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    deferredPrompt = e;

    if (installBtn) {
      installBtn.style.display = 'inline-flex';
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        installBtn.style.display = 'none';
      });
    }
  });

  window.addEventListener('appinstalled', () => {
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  });
}

document.addEventListener("DOMContentLoaded", init);

