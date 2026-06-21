// NEW AMENDMENT: Isolated operational JavaScript logic out cleanly into its own standalone file block resource
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/18-noRoTzvpO1QRw83WhwuOA7Ba-dEgd8Kw7y3bg7mZk/gviz/tq?tqx=out:json';

fetch(SHEET_URL)
  .then(res => res.text())
  .then(text => {
    const json = JSON.parse(text.substr(47).slice(0, -2));
    const rows = json.table.rows;
    
    const sectionDescriptions = {};
    const badgeGroups = {};
    const sectionOrder = [];

    // Loop through rows and index them correctly to assign global user storage tracking state keys
    rows.slice(1).forEach((r, index) => {
      const section = r.c[0] ? r.c[0].v : 'Other';
      const title = r.c[1] ? r.c[1].v : 'Untitled';
      const description = r.c[2] ? r.c[2].v : '';
      const flag = r.c[3] ? r.c[3].v : '';
      const image = r.c[4] ? `images/${r.c[4].v}` : 'https://via.placeholder.com/110?text=Badge';
      
      // NEW AMENDMENT: Formulates a fingerprint tracker tag per index entry to preserve checked states across sessions
      const uniqueKey = `badge-id-index-${index}`; 

      if (!sectionOrder.includes(section)) {
        sectionOrder.push(section);
      }

      if (title === 'SECTION_DESCRIPTION') {
        sectionDescriptions[section] = description;
      } else {
        if (!badgeGroups[section]) badgeGroups[section] = [];
        badgeGroups[section].push({ uniqueKey, title, description, flag, image });
      }
    });

    const container = document.getElementById('portfolio-container');
    container.innerHTML = ''; 

    // Category section loop builder
    sectionOrder.forEach(section => {
      if (!badgeGroups[section] || badgeGroups[section].length === 0) return;

      const heading = document.createElement('h2');
      heading.textContent = section;
      container.appendChild(heading);

      if (sectionDescriptions[section]) {
        const blurb = document.createElement('p');
        blurb.className = 'section-blurb';
        blurb.textContent = sectionDescriptions[section];
        container.appendChild(blurb);
      }

      const grid = document.createElement('div');
      grid.className = 'grid';

      badgeGroups[section].forEach(badge => {
        const card = document.createElement('div');
        card.className = 'card';
        
        // NEW AMENDMENT: Embed flag attribute properties natively to the card element node for quick JavaScript tracking queries
        if (badge.flag) card.setAttribute('data-flag', badge.flag);

        // NEW AMENDMENT: Pull saved memory records from disk storage to ensure user checked items stand active
        const isEarned = localStorage.getItem(badge.uniqueKey) === 'true';
        if (isEarned) card.classList.add('earned');

        const flagHTML = badge.flag ? `<span class="flag-pill">${badge.flag}</span>` : '';

        card.innerHTML = `
          <div class="img-container">
            <img src="${badge.image}" alt="${badge.title}">
            ${flagHTML}
          </div>
          <div class="title">${badge.title}</div>
          <p class="desc">${badge.description}</p>
          
          <!-- NEW AMENDMENT: Custom round check markup layout footprint component -->
          <label class="earned-label">
            <input type="checkbox" class="badge-checker" data-id="${badge.uniqueKey}" ${isEarned ? 'checked' : ''}> Earned It!
          </label>
        `;
        grid.appendChild(card);
      });

      container.appendChild(grid);
    });

    // NEW AMENDMENT: Initialize Event Listener handlers for User Checklist Actions & Confetti triggers
    document.querySelectorAll('.badge-checker').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const cardElement = e.target.closest('.card');
        const badgeId = e.target.getAttribute('data-id');
        const isRare = cardElement.getAttribute('data-flag') === 'RARE!';

        if (e.target.checked) {
          cardElement.classList.add('earned');
          localStorage.setItem(badgeId, 'true'); // Commit true flag status rule to browser disk
          
          // NEW AMENDMENT: Execute standard vs massive fireworks celebration arrays depending on RARE! parameter conditions
          if (isRare) {
            confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
          } else {
            confetti({ particleCount: 55, spread: 40, origin: { y: 0.7 } });
          }
        } else {
          cardElement.classList.remove('earned');
          localStorage.setItem(badgeId, 'false'); // Wipe memory parameter rule state
        }
      });
    });

    // NEW AMENDMENT: High-performance structural string filter tracking loop for the search input component
    document.getElementById('badge-search').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.card').forEach(card => {
        const title = card.querySelector('.title').textContent.toLowerCase();
        const desc = card.querySelector('.desc').textContent.toLowerCase();
        
        if (title.includes(query) || desc.includes(query)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
      
      // NEW AMENDMENT: Actively sweep and clear out empty Category Headers and Blurbs when query filters hide all respective children cards
      document.querySelectorAll('#portfolio-container h2').forEach(h2 => {
        let nextEl = h2.nextElementSibling;
        let hasVisibleCards = false;
        
        while (nextEl && nextEl.tagName !== 'H2') {
          if (nextEl.classList.contains('grid')) {
            const cards = nextEl.querySelectorAll('.card');
            cards.forEach(c => { if(c.style.display !== 'none') hasVisibleCards = true; });
          }
          nextEl = nextEl.nextElementSibling;
        }
        
        h2.style.display = hasVisibleCards ? 'block' : 'none';
        
        if (h2.nextElementSibling && h2.nextElementSibling.classList.contains('section-blurb')) {
          h2.nextElementSibling.style.display = hasVisibleCards ? 'block' : 'none';
        }
      });
    });

  })
  .catch(err => {
    document.getElementById('portfolio-container').innerHTML = '<div id="loading" style="color:#991b1b;">Error loading badges. Check configuration sharing.</div>';
    console.error(err);
  });app.js
