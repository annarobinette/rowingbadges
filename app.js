const SHEET_URL = 'https://docs.google.com/spreadsheets/d/18-noRoTzvpO1QRw83WhwuOA7Ba-dEgd8Kw7y3bg7mZk/gviz/tq?tqx=out:json';

// Google Apps Script Web App URL (deployed from the same spreadsheet's
// Extensions > Apps Script). Replace with your deployed /exec URL.
const PROGRESS_API_URL = 'PASTE_YOUR_DEPLOYED_APPS_SCRIPT_WEB_APP_URL_HERE';

const PERSON_KEY = 'rowingBadgeBook:person';

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function cleanSectionName(section) {
  return section.toLowerCase().replace(/[^a-z0-9]/g, '');
}

let allBadges = [];
let totalBadges = 0;
let earnedMap = new Map();

fetch(SHEET_URL)
  .then(res => res.text())
  .then(text => {
    const json = JSON.parse(text.substr(47).slice(0, -2));
    const rows = json.table.rows;

    const sectionDescriptions = {};
    const badgeGroups = {};
    const sectionOrder = [];

    rows.slice(1).forEach(r => {
      const section = r.c[0] ? r.c[0].v : 'Other';
      const title = r.c[1] ? r.c[1].v : 'Untitled';
      const description = r.c[2] ? r.c[2].v : '';
      const flag = r.c[3] ? r.c[3].v : '';
      const image = r.c[4] ? `images/${r.c[4].v}` : 'https://via.placeholder.com/110?text=Badge';
      const rawId = r.c[5] ? r.c[5].v : '';
      const badgeId = rawId ? String(rawId).trim() : slugify(title);

      if (!sectionOrder.includes(section)) {
        sectionOrder.push(section);
      }

      if (title === 'SECTION_DESCRIPTION') {
        sectionDescriptions[section] = description;
      } else {
        if (!badgeGroups[section]) badgeGroups[section] = [];
        badgeGroups[section].push({ id: badgeId, title, description, flag, image, section });
      }
    });

    // ---- Top nav ----
    const topnav = document.getElementById('topnav');
    topnav.innerHTML = '';
    sectionOrder.forEach((section, i) => {
      if (!badgeGroups[section] || badgeGroups[section].length === 0) return;
      const clean = cleanSectionName(section);
      const link = document.createElement('a');
      link.href = `#section-${clean}`;
      link.className = 'topnav-link' + (i === 0 ? ' active' : '');
      link.textContent = section;
      link.addEventListener('click', () => {
        document.querySelectorAll('.topnav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
      topnav.appendChild(link);
    });

    // ---- Board ----
    const container = document.getElementById('portfolio-container');
    container.innerHTML = '';

    sectionOrder.forEach(section => {
      if (!badgeGroups[section] || badgeGroups[section].length === 0) return;

      const clean = cleanSectionName(section);

      const heading = document.createElement('h2');
      heading.id = `section-${clean}`;
      heading.textContent = section;
      container.appendChild(heading);

      if (sectionDescriptions[section]) {
        const blurb = document.createElement('p');
        blurb.className = 'section-blurb';
        blurb.textContent = sectionDescriptions[section];
        container.appendChild(blurb);
      }

      const grid = document.createElement('div');
      grid.className = 'plaques';

      badgeGroups[section].forEach(badge => {
        const article = document.createElement('article');
        article.className = 'plaque';
        article.setAttribute('data-badge', badge.id);
        article.setAttribute('tabindex', '0');

        const tagHTML = badge.flag ? `<span class="plaque-tag">${badge.flag}</span>` : '';

        article.innerHTML = `
          ${tagHTML}
          <span class="plaque-more" aria-hidden="true">+</span>
          <div class="plaque-medal"><img src="${badge.image}" alt=""></div>
          <div class="plaque-title">${badge.title}</div>
          <p class="plaque-desc">${badge.description}</p>
          <div class="plaque-status">
            <button type="button" class="earn-toggle" aria-pressed="false">
              <span class="dot"></span><span class="state">Earn it!</span>
            </button>
            <span class="meta">—</span>
          </div>
        `;
        grid.appendChild(article);
        allBadges.push(badge);
      });

      container.appendChild(grid);
    });

    totalBadges = allBadges.length;
    document.getElementById('readoutTotal').textContent = totalBadges;
    document.getElementById('topbarStatTotal').textContent = totalBadges;

    buildStrokeMeter();
    wireExpandBehavior();
    wireEarnToggles();
    wireSearch();
    wirePersonSwitch();
  })
  .catch(err => {
    document.getElementById('portfolio-container').innerHTML = '<div id="loading" style="color:#e35b45;">Error loading badges. Check configuration sharing.</div>';
    console.error(err);
  });

// ---- Stats ----

function buildStrokeMeter() {
  const meter = document.getElementById('strokeMeter');
  meter.innerHTML = '';
  for (let i = 0; i < 20; i++) {
    meter.appendChild(document.createElement('i'));
  }
}

function updateStats() {
  const count = earnedMap.size;
  document.getElementById('readoutNum').textContent = count;
  document.getElementById('topbarStatNum').textContent = count;

  const lit = totalBadges > 0 ? Math.round((count / totalBadges) * 20) : 0;
  document.querySelectorAll('#strokeMeter i').forEach((tick, i) => {
    tick.classList.toggle('lit', i < lit);
  });
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch (e) {
    return 'Earned';
  }
}

function applyEarnedState() {
  document.querySelectorAll('.plaque').forEach(plaque => {
    const id = plaque.getAttribute('data-badge');
    const earnedAt = earnedMap.get(id);
    const earned = !!earnedAt;
    plaque.classList.toggle('earned', earned);
    const btn = plaque.querySelector('.earn-toggle');
    const state = plaque.querySelector('.state');
    const meta = plaque.querySelector('.meta');
    if (btn) btn.setAttribute('aria-pressed', earned ? 'true' : 'false');
    if (state) state.textContent = earned ? 'Earned' : 'Earn it!';
    if (meta) meta.textContent = earned ? formatTime(earnedAt) : '—';
  });
  updateStats();
}

// ---- Person switching ----

async function wirePersonSwitch() {
  const select = document.getElementById('personSelect');

  try {
    const res = await fetch(`${PROGRESS_API_URL}?mode=users`);
    if (!res.ok) throw new Error(`Progress API returned ${res.status}`);
    const users = await res.json();
    if (users.length > 0) {
      select.innerHTML = '';
      users.forEach(u => {
        const option = document.createElement('option');
        option.value = u.value;
        option.textContent = u.name;
        select.appendChild(option);
      });
    }
  } catch (err) {
    console.error('Could not load the crew list, falling back to whatever is in the HTML:', err);
  }

  const saved = localStorage.getItem(PERSON_KEY);
  if (saved && [...select.options].some(o => o.value === saved)) {
    select.value = saved;
  }

  loadPerson(select.value);

  select.addEventListener('change', () => {
    localStorage.setItem(PERSON_KEY, select.value);
    loadPerson(select.value);
  });
}

async function loadPerson(person) {
  earnedMap = new Map();
  applyEarnedState();

  try {
    const res = await fetch(`${PROGRESS_API_URL}?person=${encodeURIComponent(person)}`);
    if (!res.ok) throw new Error(`Progress API returned ${res.status}`);
    const rows = await res.json();
    earnedMap = new Map(rows.map(row => [row.badge, row.earnedAt]));
  } catch (err) {
    console.error('Could not load progress from the sheet:', err);
    return;
  }

  applyEarnedState();
}

function currentPerson() {
  return document.getElementById('personSelect').value;
}

// ---- Earn toggle + confetti ----

function wireEarnToggles() {
  document.querySelectorAll('.earn-toggle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const plaque = btn.closest('.plaque');
      const id = plaque.getAttribute('data-badge');
      const person = currentPerson();
      const nowEarned = !earnedMap.has(id);

      if (nowEarned) {
        earnedMap.set(id, new Date().toISOString());
      } else {
        earnedMap.delete(id);
      }
      applyEarnedState();

      if (nowEarned) {
        const isRare = plaque.querySelector('.plaque-tag') !== null;
        try {
          fireConfetti(isRare);
        } catch (err) {
          console.error('Confetti failed to fire:', err);
        }
      }

      let saveError = null;
      try {
        const res = await fetch(PROGRESS_API_URL, {
          method: 'POST',
          // No explicit Content-Type: keeps this a CORS "simple request" so
          // Apps Script Web Apps (which don't handle preflight) still work.
          body: JSON.stringify({ person, badge: id, action: nowEarned ? 'earn' : 'unearn' })
        });
        if (!res.ok) throw new Error(`Progress API returned ${res.status}`);
      } catch (err) {
        saveError = err;
      }

      if (saveError) {
        console.error('Could not save progress to the sheet:', saveError);
      }
    });
  });
}

function fireConfetti(isRare) {
  if (isRare) {
    const duration = 3 * 1000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 7, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#dd9257', '#e35b45', '#edf1ef'] });
      confetti({ particleCount: 7, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#dd9257', '#e35b45', '#edf1ef'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  } else {
    confetti({ particleCount: 60, spread: 60, origin: { x: 0.2, y: 0.6 }, colors: ['#dd9257', '#edf1ef'] });
    confetti({ particleCount: 60, spread: 60, origin: { x: 0.8, y: 0.6 }, colors: ['#dd9257', '#edf1ef'] });
  }
}

// ---- Mobile tap-to-expand ----

function wireExpandBehavior() {
  const compactQuery = window.matchMedia('(max-width: 720px)');

  document.querySelectorAll('.plaque').forEach(plaque => {
    function toggle(e) {
      if (e.target.closest('.earn-toggle')) return;
      if (!compactQuery.matches) return;
      const expanded = plaque.classList.toggle('expanded');
      plaque.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }
    plaque.addEventListener('click', toggle);
    plaque.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle(e);
      }
    });
  });
}

// ---- Search ----

function wireSearch() {
  document.getElementById('badge-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.plaque').forEach(plaque => {
      const title = plaque.querySelector('.plaque-title').textContent.toLowerCase();
      const desc = plaque.querySelector('.plaque-desc').textContent.toLowerCase();
      plaque.style.display = (title.includes(query) || desc.includes(query)) ? '' : 'none';
    });

    document.querySelectorAll('#portfolio-container h2').forEach(h2 => {
      let nextEl = h2.nextElementSibling;
      let hasVisible = false;
      while (nextEl && nextEl.tagName !== 'H2') {
        if (nextEl.classList.contains('plaques')) {
          nextEl.querySelectorAll('.plaque').forEach(p => {
            if (p.style.display !== 'none') hasVisible = true;
          });
        }
        nextEl = nextEl.nextElementSibling;
      }
      h2.style.display = hasVisible ? '' : 'none';
      if (h2.nextElementSibling && h2.nextElementSibling.classList.contains('section-blurb')) {
        h2.nextElementSibling.style.display = hasVisible ? '' : 'none';
      }
    });
  });
}

// ---- Hero ripple ----

(function () {
  const canvas = document.getElementById('ripple');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    w = canvas.offsetWidth;
    h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const lines = 7;

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < lines; i++) {
      const baseY = h * 0.18 + (i * h * 0.62) / lines;
      const amp = 6 + i * 1.1;
      const freq = 0.012 - i * 0.0006;
      const speed = 0.00025 + i * 0.00002;
      const alpha = 0.05 + (i / lines) * 0.10;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const y = baseY + Math.sin(x * freq + t * speed + i) * amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(221, 146, 87, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  if (reduced) {
    draw(0);
  } else {
    function loop(t) {
      draw(t);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
})();
